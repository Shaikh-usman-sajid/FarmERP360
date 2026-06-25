from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
import os, uuid, shutil
from datetime import date
from decimal import Decimal
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.models import (
    Animal, AnimalPhoto, AnimalWeight, User, UserRole,
    AnimalSpecies, AnimalStatus, FeedConsumption, FeedType, Farm
)
from app.schemas.schemas import AnimalCreate, AnimalUpdate, AnimalOut, WeightCreate, WeightOut

router = APIRouter(prefix="/animals", tags=["Animals"])

FINANCIAL_ROLES = {UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ACCOUNTANT}
EDIT_ROLES = {UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.FARM_MANAGER}


def get_org(current_user):
    return current_user.organization_id


def _compute_feed_costs(db: Session, animal_ids: list) -> dict:
    if not animal_ids:
        return {}
    rows = (
        db.query(
            FeedConsumption.animal_id,
            func.coalesce(func.sum(FeedConsumption.quantity * FeedType.cost_per_unit), 0)
        )
        .join(FeedType, FeedConsumption.feed_type_id == FeedType.id)
        .filter(FeedConsumption.animal_id.in_(animal_ids))
        .group_by(FeedConsumption.animal_id)
        .all()
    )
    return {r[0]: float(r[1]) for r in rows}


def _animal_dict(animal: Animal, feed_cost: float, show_financials: bool) -> dict:
    purchase = float(animal.purchase_price or 0)
    computed_value = purchase + feed_cost
    d = AnimalOut.from_orm(animal).dict()
    d["feed_cost"] = round(feed_cost, 2)
    d["current_value"] = round(computed_value, 2)
    if not show_financials:
        d["purchase_price"] = None
    return d


def _get_latest_weights(db: Session, animal_ids: list) -> dict:
    if not animal_ids:
        return {}
    sub = (
        db.query(AnimalWeight.animal_id, func.max(AnimalWeight.recorded_date).label("max_date"))
        .filter(AnimalWeight.animal_id.in_(animal_ids))
        .group_by(AnimalWeight.animal_id)
        .subquery()
    )
    from sqlalchemy import and_
    rows = (
        db.query(AnimalWeight)
        .join(sub, and_(AnimalWeight.animal_id == sub.c.animal_id,
                        AnimalWeight.recorded_date == sub.c.max_date))
        .all()
    )
    return {r.animal_id: r for r in rows}


@router.get("")
def list_animals(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),
    species: Optional[str] = None,
    status: Optional[str] = None,
    gender: Optional[str] = None,
    ownership_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Animal).filter(Animal.organization_id == get_org(current_user), Animal.is_active == True)
    if species:
        query = query.filter(Animal.species == species)
    if status:
        query = query.filter(Animal.status == status)
    if gender:
        query = query.filter(Animal.gender == gender)
    if ownership_type:
        query = query.filter(Animal.ownership_type == ownership_type)
    if search:
        query = query.filter(
            or_(Animal.animal_code.ilike(f"%{search}%"),
                Animal.name.ilike(f"%{search}%"),
                Animal.ear_tag.ilike(f"%{search}%"))
        )
    total = query.count()
    animals = query.order_by(Animal.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    animal_ids = [a.id for a in animals]
    feed_costs = _compute_feed_costs(db, animal_ids)
    latest_weights = _get_latest_weights(db, animal_ids)
    show_financials = current_user.role in FINANCIAL_ROLES

    items = []
    for a in animals:
        d = _animal_dict(a, feed_costs.get(a.id, 0.0), show_financials)
        w = latest_weights.get(a.id)
        d["latest_weight_kg"] = float(w.weight_kg) if w else None
        d["last_weighed_date"] = str(w.recorded_date) if w else None
        items.append(d)
    return {"success": True, "data": {"total": total, "page": page, "per_page": per_page, "items": items}}


@router.get("/{animal_id}")
def get_animal(animal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    animal = db.query(Animal).filter(Animal.id == animal_id, Animal.organization_id == get_org(current_user)).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    latest_weight = db.query(AnimalWeight).filter(
        AnimalWeight.animal_id == animal_id
    ).order_by(AnimalWeight.recorded_date.desc()).first()

    feed_costs = _compute_feed_costs(db, [animal_id])
    show_financials = current_user.role in FINANCIAL_ROLES
    data = _animal_dict(animal, feed_costs.get(animal_id, 0.0), show_financials)
    data["latest_weight_kg"] = float(latest_weight.weight_kg) if latest_weight else None
    data["photo_count"] = len(animal.photos)
    return {"success": True, "data": data}


@router.post("")
def create_animal(
    payload: AnimalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed = [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.FARM_MANAGER, UserRole.DATA_ENTRY]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    farm = db.query(Farm).filter(Farm.organization_id == get_org(current_user)).first()
    if not farm:
        raise HTTPException(status_code=400, detail="No farm found for this organization")

    existing = db.query(Animal).filter(
        Animal.animal_code == payload.animal_code,
        Animal.organization_id == get_org(current_user)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Animal code already exists")

    animal_data = payload.dict(exclude={"farm_id", "initial_weight_kg"})
    animal = Animal(
        organization_id=get_org(current_user),
        farm_id=payload.farm_id or farm.id,
        **animal_data
    )
    db.add(animal)
    db.flush()

    if payload.initial_weight_kg:
        weight = AnimalWeight(
            animal_id=animal.id,
            weight_kg=payload.initial_weight_kg,
            recorded_date=payload.purchase_date or date.today(),
            recorded_by=current_user.id,
            notes="Initial weight at registration"
        )
        db.add(weight)

    db.commit()
    db.refresh(animal)
    return {"success": True, "message": "Animal created", "data": AnimalOut.from_orm(animal)}


@router.put("/{animal_id}")
def update_animal(
    animal_id: str,
    payload: AnimalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in EDIT_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    animal = db.query(Animal).filter(Animal.id == animal_id, Animal.organization_id == get_org(current_user)).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    update_data = payload.dict(exclude_none=True)

    # Only financial roles can update purchase_price
    if "purchase_price" in update_data and current_user.role not in FINANCIAL_ROLES:
        del update_data["purchase_price"]

    for field, value in update_data.items():
        setattr(animal, field, value)

    db.commit()
    db.refresh(animal)
    feed_costs = _compute_feed_costs(db, [animal_id])
    show_financials = current_user.role in FINANCIAL_ROLES
    return {"success": True, "data": _animal_dict(animal, feed_costs.get(animal_id, 0.0), show_financials)}


@router.delete("/{animal_id}")
def delete_animal(
    animal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed = [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.FARM_MANAGER]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    animal = db.query(Animal).filter(Animal.id == animal_id, Animal.organization_id == get_org(current_user)).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")
    animal.is_active = False
    db.commit()
    return {"success": True, "message": "Animal removed"}


# ─── BULK IMPORT ────────────────────────────────────────

@router.post("/import")
def import_animals(
    payload: List[AnimalCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in EDIT_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    farm = db.query(Farm).filter(Farm.organization_id == get_org(current_user)).first()
    if not farm:
        raise HTTPException(status_code=400, detail="No farm found")

    created = 0
    skipped = 0
    errors: list = []

    for i, item in enumerate(payload):
        existing = db.query(Animal).filter(
            Animal.animal_code == item.animal_code,
            Animal.organization_id == get_org(current_user)
        ).first()
        if existing:
            errors.append(f"Row {i + 1}: Code '{item.animal_code}' already exists — skipped")
            skipped += 1
            continue

        animal_data = item.dict(exclude={"farm_id", "initial_weight_kg"})
        animal = Animal(
            organization_id=get_org(current_user),
            farm_id=item.farm_id or farm.id,
            **animal_data
        )
        db.add(animal)
        db.flush()

        if item.initial_weight_kg:
            weight = AnimalWeight(
                animal_id=animal.id,
                weight_kg=item.initial_weight_kg,
                recorded_date=item.purchase_date or date.today(),
                recorded_by=current_user.id,
                notes="Initial weight (imported)"
            )
            db.add(weight)

        created += 1

    db.commit()
    return {"success": True, "created": created, "skipped": skipped, "errors": errors}


# ─── PHOTOS ────────────────────────────────────────────

@router.get("/{animal_id}/photos")
def get_photos(animal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photos = db.query(AnimalPhoto).filter(AnimalPhoto.animal_id == animal_id).all()
    return {"success": True, "data": [{"id": p.id, "photo_url": p.photo_url, "is_primary": p.is_primary, "caption": p.caption} for p in photos]}


@router.post("/{animal_id}/photos")
async def upload_photo(
    animal_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    animal = db.query(Animal).filter(Animal.id == animal_id, Animal.organization_id == get_org(current_user)).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    os.makedirs(f"{settings.UPLOAD_DIR}/animals", exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"{settings.UPLOAD_DIR}/animals/{filename}"

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    existing_primary = db.query(AnimalPhoto).filter(AnimalPhoto.animal_id == animal_id, AnimalPhoto.is_primary == True).first()
    photo = AnimalPhoto(
        animal_id=animal_id,
        photo_url=f"/uploads/animals/{filename}",
        is_primary=existing_primary is None,
        uploaded_by=current_user.id
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return {"success": True, "data": {"id": photo.id, "photo_url": photo.photo_url}}


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(AnimalPhoto).filter(AnimalPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    db.delete(photo)
    db.commit()
    return {"success": True, "message": "Photo deleted"}


# ─── WEIGHTS ───────────────────────────────────────────

@router.get("/{animal_id}/weights")
def get_weights(animal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    weights = db.query(AnimalWeight).filter(AnimalWeight.animal_id == animal_id).order_by(AnimalWeight.recorded_date.desc()).all()
    return {"success": True, "data": [WeightOut.from_orm(w) for w in weights]}


@router.post("/{animal_id}/weights")
def add_weight(
    animal_id: str,
    payload: WeightCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    animal = db.query(Animal).filter(Animal.id == animal_id, Animal.organization_id == get_org(current_user)).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")
    weight = AnimalWeight(
        animal_id=animal_id,
        weight_kg=payload.weight_kg,
        recorded_date=payload.recorded_date,
        notes=payload.notes,
        recorded_by=current_user.id
    )
    db.add(weight)
    db.commit()
    db.refresh(weight)
    return {"success": True, "data": WeightOut.from_orm(weight)}
