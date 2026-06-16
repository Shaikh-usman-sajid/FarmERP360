from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Vaccination, Treatment, BreedingRecord, User
from app.schemas.schemas import VaccinationCreate, VaccinationOut, TreatmentCreate, TreatmentOut

router = APIRouter(tags=["Health"])

vacc_router = APIRouter(prefix="/vaccinations")
treat_router = APIRouter(prefix="/treatments")
breed_router = APIRouter(prefix="/breeding-records")


def get_org(u): return u.organization_id


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
    db.delete(t)
    db.commit()
    return {"success": True, "message": "Deleted"}


# ─── BREEDING ──────────────────────────────────────────

@breed_router.get("")
def list_breeding(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BreedingRecord).filter(BreedingRecord.organization_id == get_org(current_user))
    total = query.count()
    items = query.offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [
        {"id": b.id, "animal_id": b.animal_id, "breeding_date": str(b.breeding_date), "expected_delivery": str(b.expected_delivery) if b.expected_delivery else None, "outcome": b.outcome}
        for b in items
    ]}}


@breed_router.post("")
def create_breeding(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import BreedingRecord
    from datetime import date
    b = BreedingRecord(organization_id=get_org(current_user), **{k: v for k, v in payload.items() if v is not None})
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"success": True, "data": {"id": b.id, "animal_id": b.animal_id}}


router.include_router(vacc_router)
router.include_router(treat_router)
router.include_router(breed_router)
