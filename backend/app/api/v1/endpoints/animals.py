from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import os, uuid, shutil
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.models import Animal, AnimalPhoto, AnimalWeight, User, UserRole, AnimalSpecies, AnimalStatus
from app.schemas.schemas import AnimalCreate, AnimalUpdate, AnimalOut, WeightCreate, WeightOut

router = APIRouter(prefix="/animals", tags=["Animals"])


def get_org(current_user):
    return current_user.organization_id


@router.get("")
def list_animals(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    species: Optional[str] = None,
    status: Optional[str] = None,
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
    return {"success": True, "data": {"total": total, "page": page, "per_page": per_page, "items": [AnimalOut.from_orm(a) for a in animals]}}


@router.get("/{animal_id}")
def get_animal(animal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    animal = db.query(Animal).filter(Animal.id == animal_id, Animal.organization_id == get_org(current_user)).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")
    
    # Get latest weight
    latest_weight = db.query(AnimalWeight).filter(
        AnimalWeight.animal_id == animal_id
    ).order_by(AnimalWeight.recorded_date.desc()).first()
    
    data = AnimalOut.from_orm(animal).dict()
    data["latest_weight_kg"] = float(latest_weight.weight_kg) if latest_weight else None
    data["photo_count"] = len(animal.photos)
    return {"success": True, "data": data}


@router.post("")
def create_animal(
    payload: AnimalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user has permission
    allowed = [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.FARM_MANAGER, UserRole.DATA_ENTRY]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get default farm
    from app.models.models import Farm
    farm = db.query(Farm).filter(Farm.organization_id == get_org(current_user)).first()
    if not farm:
        raise HTTPException(status_code=400, detail="No farm found for this organization")

    existing = db.query(Animal).filter(
        Animal.animal_code == payload.animal_code,
        Animal.organization_id == get_org(current_user)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Animal code already exists")

    animal = Animal(
        organization_id=get_org(current_user),
        farm_id=payload.farm_id or farm.id,
        **payload.dict(exclude={"farm_id"})
    )
    db.add(animal)
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
    animal = db.query(Animal).filter(Animal.id == animal_id, Animal.organization_id == get_org(current_user)).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")
    for field, value in payload.dict(exclude_none=True).items():
        setattr(animal, field, value)
    db.commit()
    db.refresh(animal)
    return {"success": True, "data": AnimalOut.from_orm(animal)}


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
