from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Field, CropCycle, User, CropStatus
from app.schemas.schemas import FieldCreate, FieldOut, CropCycleCreate, CropCycleOut

router = APIRouter(tags=["Agriculture"])
field_router = APIRouter(prefix="/fields")
crop_router = APIRouter(prefix="/crop-cycles")
harvest_router = APIRouter(prefix="/harvests")


def get_org(u): return u.organization_id


@field_router.get("")
def list_fields(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Field).filter(Field.organization_id == get_org(current_user), Field.is_active == True)
    total = query.count()
    items = query.offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [FieldOut.from_orm(f) for f in items]}}


@field_router.get("/{field_id}")
def get_field(field_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(Field).filter(Field.id == field_id, Field.organization_id == get_org(current_user)).first()
    if not f:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"success": True, "data": FieldOut.from_orm(f)}


@field_router.post("")
def create_field(payload: FieldCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Farm
    farm = db.query(Farm).filter(Farm.organization_id == get_org(current_user)).first()
    f = Field(
        organization_id=get_org(current_user),
        farm_id=payload.farm_id or (farm.id if farm else None),
        **{k: v for k, v in payload.dict().items() if k != "farm_id"}
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return {"success": True, "data": FieldOut.from_orm(f)}


@field_router.put("/{field_id}")
def update_field(field_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(Field).filter(Field.id == field_id, Field.organization_id == get_org(current_user)).first()
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(f, k):
            setattr(f, k, v)
    db.commit()
    return {"success": True, "data": FieldOut.from_orm(f)}


@field_router.delete("/{field_id}")
def delete_field(field_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(Field).filter(Field.id == field_id, Field.organization_id == get_org(current_user)).first()
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    f.is_active = False
    db.commit()
    return {"success": True, "message": "Field removed"}


@crop_router.get("")
def list_crops(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    field_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CropCycle).filter(CropCycle.organization_id == get_org(current_user))
    if field_id:
        query = query.filter(CropCycle.field_id == field_id)
    if status:
        query = query.filter(CropCycle.status == status)
    total = query.count()
    items = query.order_by(CropCycle.sowing_date.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [CropCycleOut.from_orm(c) for c in items]}}


@crop_router.post("")
def create_crop(payload: CropCycleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = CropCycle(organization_id=get_org(current_user), **payload.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"success": True, "data": CropCycleOut.from_orm(c)}


@crop_router.put("/{crop_id}")
def update_crop(crop_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(CropCycle).filter(CropCycle.id == crop_id, CropCycle.organization_id == get_org(current_user)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(c, k):
            setattr(c, k, v)
    db.commit()
    return {"success": True, "data": CropCycleOut.from_orm(c)}


@harvest_router.get("")
def list_harvests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    harvested = db.query(CropCycle).filter(
        CropCycle.organization_id == get_org(current_user),
        CropCycle.status == CropStatus.HARVESTED
    ).all()
    return {"success": True, "data": [CropCycleOut.from_orm(c) for c in harvested]}


@harvest_router.post("")
def record_harvest(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    crop_id = payload.get("crop_cycle_id")
    c = db.query(CropCycle).filter(CropCycle.id == crop_id, CropCycle.organization_id == get_org(current_user)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Crop cycle not found")
    c.status = CropStatus.HARVESTED
    c.actual_yield_kg = payload.get("actual_yield_kg")
    c.actual_harvest_date = payload.get("harvest_date")
    db.commit()
    return {"success": True, "data": CropCycleOut.from_orm(c)}


router.include_router(field_router)
router.include_router(crop_router)
router.include_router(harvest_router)
