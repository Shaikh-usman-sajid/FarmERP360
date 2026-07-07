from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
from datetime import date
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Vaccination, Treatment, BreedingRecord, User, Product, InventoryTransaction, InventoryTxType
from app.schemas.schemas import VaccinationCreate, VaccinationOut, TreatmentCreate, TreatmentOut

router = APIRouter(tags=["Health"])

vacc_router = APIRouter(prefix="/vaccinations")
treat_router = APIRouter(prefix="/treatments")
breed_router = APIRouter(prefix="/breeding-records")


def get_org(u): return u.organization_id


def _deduct_inventory(product_id: str, quantity: Decimal, org_id: str, tx_date: date, ref: str, created_by: str, db: Session):
    product = db.query(Product).filter(Product.id == product_id, Product.organization_id == org_id).first()
    if not product:
        return
    tx = InventoryTransaction(
        organization_id=org_id,
        product_id=product_id,
        transaction_type=InventoryTxType.OUT,
        quantity=quantity,
        reference=ref,
        transaction_date=tx_date,
        created_by=created_by,
    )
    db.add(tx)
    product.current_stock = max(Decimal("0"), (product.current_stock or Decimal("0")) - quantity)


def _restore_inventory(product_id: str, quantity: Decimal, org_id: str, db: Session):
    product = db.query(Product).filter(Product.id == product_id, Product.organization_id == org_id).first()
    if product:
        product.current_stock = (product.current_stock or Decimal("0")) + quantity


# ─── VACCINATIONS ──────────────────────────────────────

@vacc_router.get("")
def list_vaccinations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    animal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Vaccination).filter(Vaccination.organization_id == get_org(current_user))
    if animal_id:
        query = query.filter(Vaccination.animal_id == animal_id)
    total = query.count()
    items = query.order_by(Vaccination.administered_date.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [VaccinationOut.from_orm(v) for v in items]}}


@vacc_router.get("/{vacc_id}")
def get_vaccination(vacc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = db.query(Vaccination).filter(Vaccination.id == vacc_id, Vaccination.organization_id == get_org(current_user)).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vaccination not found")
    return {"success": True, "data": VaccinationOut.from_orm(v)}


@vacc_router.post("")
def create_vaccination(payload: VaccinationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = Vaccination(organization_id=get_org(current_user), created_by=current_user.id, **payload.dict())
    db.add(v)
    if payload.medicine_product_id and payload.medicine_quantity:
        _deduct_inventory(
            payload.medicine_product_id, payload.medicine_quantity,
            get_org(current_user), payload.administered_date,
            f"Vaccination: {payload.vaccine_name}", current_user.id, db
        )
    db.commit()
    db.refresh(v)
    return {"success": True, "data": VaccinationOut.from_orm(v)}


@vacc_router.put("/{vacc_id}")
def update_vaccination(vacc_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = db.query(Vaccination).filter(Vaccination.id == vacc_id, Vaccination.organization_id == get_org(current_user)).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    for k, val in payload.items():
        if hasattr(v, k):
            setattr(v, k, val)
    db.commit()
    return {"success": True, "data": VaccinationOut.from_orm(v)}


@vacc_router.delete("/{vacc_id}")
def delete_vaccination(vacc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = db.query(Vaccination).filter(Vaccination.id == vacc_id, Vaccination.organization_id == get_org(current_user)).first()
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    if v.medicine_product_id and v.medicine_quantity:
        _restore_inventory(v.medicine_product_id, v.medicine_quantity, get_org(current_user), db)
    db.delete(v)
    db.commit()
    return {"success": True, "message": "Deleted"}


# ─── TREATMENTS ────────────────────────────────────────

@treat_router.get("")
def list_treatments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    animal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Treatment).filter(Treatment.organization_id == get_org(current_user))
    if animal_id:
        query = query.filter(Treatment.animal_id == animal_id)
    total = query.count()
    items = query.order_by(Treatment.treatment_date.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [TreatmentOut.from_orm(t) for t in items]}}


@treat_router.post("")
def create_treatment(payload: TreatmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = Treatment(organization_id=get_org(current_user), created_by=current_user.id, **payload.dict())
    db.add(t)
    if payload.medicine_product_id and payload.medicine_quantity:
        _deduct_inventory(
            payload.medicine_product_id, payload.medicine_quantity,
            get_org(current_user), payload.treatment_date,
            f"Treatment: {payload.diagnosis}", current_user.id, db
        )
    db.commit()
    db.refresh(t)
    return {"success": True, "data": TreatmentOut.from_orm(t)}


@treat_router.put("/{treat_id}")
def update_treatment(treat_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(Treatment).filter(Treatment.id == treat_id, Treatment.organization_id == get_org(current_user)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    for k, val in payload.items():
        if hasattr(t, k):
            setattr(t, k, val)
    db.commit()
    return {"success": True, "data": TreatmentOut.from_orm(t)}


@treat_router.delete("/{treat_id}")
def delete_treatment(treat_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(Treatment).filter(Treatment.id == treat_id, Treatment.organization_id == get_org(current_user)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if t.medicine_product_id and t.medicine_quantity:
        _restore_inventory(t.medicine_product_id, t.medicine_quantity, get_org(current_user), db)
    db.delete(t)
    db.commit()
    return {"success": True, "message": "Deleted"}


# ─── BREEDING ──────────────────────────────────────────

@breed_router.get("")
def list_breeding(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    animal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.models import Animal
    query = db.query(BreedingRecord).filter(BreedingRecord.organization_id == get_org(current_user))
    if animal_id:
        query = query.filter(BreedingRecord.animal_id == animal_id)
    total = query.count()
    items = query.order_by(BreedingRecord.breeding_date.desc()).offset((page-1)*per_page).limit(per_page).all()

    def _out(b):
        dam = db.query(Animal).filter(Animal.id == b.animal_id).first()
        sire = db.query(Animal).filter(Animal.id == b.sire_id).first() if b.sire_id else None
        return {
            "id": b.id,
            "animal_id": b.animal_id,
            "animal_code": dam.animal_code if dam else None,
            "animal_name": dam.name if dam else None,
            "sire_id": b.sire_id,
            "sire_code": sire.animal_code if sire else None,
            "breeding_date": str(b.breeding_date),
            "expected_delivery": str(b.expected_delivery) if b.expected_delivery else None,
            "actual_delivery": str(b.actual_delivery) if b.actual_delivery else None,
            "offspring_count": b.offspring_count,
            "outcome": b.outcome,
            "notes": b.notes,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }

    return {"success": True, "data": {"total": total, "items": [_out(b) for b in items]}}


@breed_router.post("")
def create_breeding(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    allowed = ["animal_id", "sire_id", "breeding_date", "expected_delivery", "actual_delivery", "offspring_count", "outcome", "notes"]
    data = {k: v for k, v in payload.items() if k in allowed and v not in (None, "")}
    b = BreedingRecord(organization_id=get_org(current_user), **data)
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"success": True, "data": {"id": b.id}}


@breed_router.put("/{record_id}")
def update_breeding(record_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    b = db.query(BreedingRecord).filter(BreedingRecord.id == record_id, BreedingRecord.organization_id == get_org(current_user)).first()
    if not b:
        raise HTTPException(status_code=404, detail="Record not found")
    allowed = ["sire_id", "breeding_date", "expected_delivery", "actual_delivery", "offspring_count", "outcome", "notes"]
    for k, v in payload.items():
        if k in allowed:
            setattr(b, k, v if v not in ("", None) else None)
    db.commit()
    return {"success": True}


@breed_router.delete("/{record_id}")
def delete_breeding(record_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    b = db.query(BreedingRecord).filter(BreedingRecord.id == record_id, BreedingRecord.organization_id == get_org(current_user)).first()
    if not b:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(b)
    db.commit()
    return {"success": True}


router.include_router(vacc_router)
router.include_router(treat_router)
router.include_router(breed_router)
