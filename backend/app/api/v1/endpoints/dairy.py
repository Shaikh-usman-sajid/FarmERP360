from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import MilkProduction, MilkSale, User, Farm
from app.schemas.schemas import MilkProductionCreate, MilkProductionOut, MilkSaleCreate, MilkSaleOut

router = APIRouter(tags=["Dairy"])

milk_router = APIRouter(prefix="/milk-productions")
sale_router = APIRouter(prefix="/milk-sales")


def get_org(u): return u.organization_id


@milk_router.get("")
def list_milk(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    animal_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MilkProduction).filter(MilkProduction.organization_id == get_org(current_user))
    if animal_id:
        query = query.filter(MilkProduction.animal_id == animal_id)
    if date_from:
        query = query.filter(MilkProduction.production_date >= date_from)
    if date_to:
        query = query.filter(MilkProduction.production_date <= date_to)
    total = query.count()
    items = query.order_by(MilkProduction.production_date.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [MilkProductionOut.from_orm(m) for m in items]}}


@milk_router.post("")
def create_milk(
    payload: MilkProductionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farm = db.query(Farm).filter(Farm.organization_id == get_org(current_user)).first()
    m = MilkProduction(
        organization_id=get_org(current_user),
        farm_id=farm.id if farm else None,
        recorded_by=current_user.id,
        **payload.dict()
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"success": True, "data": MilkProductionOut.from_orm(m)}


@milk_router.get("/summary/daily")
def daily_summary(
    days: int = Query(30, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from_date = date.today() - timedelta(days=days)
    results = db.query(
        MilkProduction.production_date,
        func.sum(MilkProduction.quantity_liters).label("total_liters")
    ).filter(
        MilkProduction.organization_id == get_org(current_user),
        MilkProduction.production_date >= from_date
    ).group_by(MilkProduction.production_date).order_by(MilkProduction.production_date).all()
    return {"success": True, "data": [{"date": str(r.production_date), "total_liters": float(r.total_liters)} for r in results]}


@milk_router.put("/{milk_id}")
def update_milk(milk_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(MilkProduction).filter(MilkProduction.id == milk_id, MilkProduction.organization_id == get_org(current_user)).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(m, k):
            setattr(m, k, v)
    db.commit()
    return {"success": True, "data": MilkProductionOut.from_orm(m)}


@milk_router.delete("/{milk_id}")
def delete_milk(milk_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(MilkProduction).filter(MilkProduction.id == milk_id, MilkProduction.organization_id == get_org(current_user)).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(m)
    db.commit()
    return {"success": True, "message": "Deleted"}


# ─── MILK SALES ────────────────────────────────────────

@sale_router.get("")
def list_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MilkSale).filter(MilkSale.organization_id == get_org(current_user))
    total = query.count()
    items = query.order_by(MilkSale.sale_date.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [MilkSaleOut.from_orm(s) for s in items]}}


@sale_router.post("")
def create_sale(payload: MilkSaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = MilkSale(organization_id=get_org(current_user), created_by=current_user.id, **payload.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"success": True, "data": MilkSaleOut.from_orm(s)}


@sale_router.put("/{sale_id}")
def update_sale(sale_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(MilkSale).filter(MilkSale.id == sale_id, MilkSale.organization_id == get_org(current_user)).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(s, k):
            setattr(s, k, v)
    db.commit()
    return {"success": True, "data": MilkSaleOut.from_orm(s)}


@sale_router.delete("/{sale_id}")
def delete_sale(sale_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(MilkSale).filter(MilkSale.id == sale_id, MilkSale.organization_id == get_org(current_user)).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return {"success": True, "message": "Deleted"}


router.include_router(milk_router)
router.include_router(sale_router)
