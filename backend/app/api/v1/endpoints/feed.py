from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    FeedType, FeedStockTransaction, FeedConsumption,
    FeedTxType, FeedSession, Animal, AnimalSpecies, User
)

router = APIRouter(tags=["Feed Management"])


def get_org(u): return u.organization_id


# ─── FEED TYPES ───────────────────────────────────────────────────────────────

@router.get("/feed-types")
def list_feed_types(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(FeedType).filter(FeedType.organization_id == get_org(current_user))
    if not include_inactive:
        q = q.filter(FeedType.is_active == True)
    items = q.order_by(FeedType.name).all()
    return {"success": True, "data": [_feed_type_dict(f) for f in items]}


@router.post("/feed-types", status_code=201)
def create_feed_type(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ft = FeedType(
        organization_id=get_org(current_user),
        name=body["name"],
        unit=body.get("unit", "kg"),
        current_stock=Decimal(str(body.get("current_stock", 0))),
        min_stock_level=Decimal(str(body.get("min_stock_level", 0))),
        cost_per_unit=Decimal(str(body["cost_per_unit"])) if body.get("cost_per_unit") else None,
        suitable_for=body.get("suitable_for"),
        description=body.get("description"),
    )
    db.add(ft)
    db.commit()
    db.refresh(ft)
    return {"success": True, "data": _feed_type_dict(ft)}


@router.put("/feed-types/{feed_type_id}")
def update_feed_type(
    feed_type_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ft = _get_feed_type(feed_type_id, get_org(current_user), db)
    for field in ("name", "unit", "suitable_for", "description"):
        if field in body:
            setattr(ft, field, body[field])
    for field in ("min_stock_level", "cost_per_unit"):
        if field in body and body[field] is not None:
            setattr(ft, field, Decimal(str(body[field])))
    if "is_active" in body:
        ft.is_active = body["is_active"]
    db.commit()
    db.refresh(ft)
    return {"success": True, "data": _feed_type_dict(ft)}


@router.delete("/feed-types/{feed_type_id}")
def delete_feed_type(
    feed_type_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ft = _get_feed_type(feed_type_id, get_org(current_user), db)
    ft.is_active = False
    db.commit()
    return {"success": True}


# ─── FEED STOCK TRANSACTIONS ──────────────────────────────────────────────────

@router.get("/feed-stock")
def list_feed_stock(
    feed_type_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(FeedStockTransaction).filter(
        FeedStockTransaction.organization_id == get_org(current_user)
    )
    if feed_type_id:
        q = q.filter(FeedStockTransaction.feed_type_id == feed_type_id)
    if date_from:
        q = q.filter(FeedStockTransaction.transaction_date >= date_from)
    if date_to:
        q = q.filter(FeedStockTransaction.transaction_date <= date_to)
    txs = q.order_by(FeedStockTransaction.transaction_date.desc()).all()
    return {"success": True, "data": [_stock_tx_dict(t) for t in txs]}


@router.post("/feed-stock", status_code=201)
def create_feed_stock_transaction(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ft = _get_feed_type(body["feed_type_id"], get_org(current_user), db)

    tx_type = FeedTxType(body["transaction_type"])
    qty = Decimal(str(body["quantity"]))
    unit_cost = Decimal(str(body["unit_cost"])) if body.get("unit_cost") else None
    total_cost = qty * unit_cost if unit_cost else None

    tx = FeedStockTransaction(
        organization_id=get_org(current_user),
        feed_type_id=ft.id,
        transaction_type=tx_type,
        quantity=qty,
        unit_cost=unit_cost,
        total_cost=total_cost,
        reference=body.get("reference"),
        notes=body.get("notes"),
        transaction_date=date.fromisoformat(body["transaction_date"]),
        created_by=current_user.id,
    )
    db.add(tx)

    # Update stock
    if tx_type == FeedTxType.IN:
        ft.current_stock = (ft.current_stock or Decimal("0")) + qty
    elif tx_type == FeedTxType.OUT:
        ft.current_stock = max(Decimal("0"), (ft.current_stock or Decimal("0")) - qty)
    else:
        ft.current_stock = qty  # ADJUSTMENT sets absolute value

    db.commit()
    db.refresh(tx)
    return {"success": True, "data": _stock_tx_dict(tx)}


# ─── FEED CONSUMPTION ─────────────────────────────────────────────────────────

@router.get("/feed-consumption")
def list_feed_consumption(
    feed_type_id: Optional[str] = None,
    animal_id: Optional[str] = None,
    species: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(FeedConsumption).filter(
        FeedConsumption.organization_id == get_org(current_user)
    )
    if feed_type_id:
        q = q.filter(FeedConsumption.feed_type_id == feed_type_id)
    if animal_id:
        q = q.filter(FeedConsumption.animal_id == animal_id)
    if species:
        q = q.filter(FeedConsumption.species == AnimalSpecies(species))
    if date_from:
        q = q.filter(FeedConsumption.consumption_date >= date_from)
    if date_to:
        q = q.filter(FeedConsumption.consumption_date <= date_to)
    records = q.order_by(FeedConsumption.consumption_date.desc()).all()
    return {"success": True, "data": [_consumption_dict(r) for r in records]}


@router.post("/feed-consumption", status_code=201)
def create_feed_consumption(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ft = _get_feed_type(body["feed_type_id"], get_org(current_user), db)
    qty = Decimal(str(body["quantity"]))

    record = FeedConsumption(
        organization_id=get_org(current_user),
        feed_type_id=ft.id,
        animal_id=body.get("animal_id"),
        species=AnimalSpecies(body["species"]) if body.get("species") else None,
        quantity=qty,
        consumption_date=date.fromisoformat(body["consumption_date"]),
        session=FeedSession(body.get("session", "morning")),
        notes=body.get("notes"),
        created_by=current_user.id,
    )
    db.add(record)

    # Deduct from stock
    ft.current_stock = max(Decimal("0"), (ft.current_stock or Decimal("0")) - qty)

    db.commit()
    db.refresh(record)
    return {"success": True, "data": _consumption_dict(record)}


@router.delete("/feed-consumption/{record_id}")
def delete_feed_consumption(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(FeedConsumption).filter(
        FeedConsumption.id == record_id,
        FeedConsumption.organization_id == get_org(current_user),
    ).first()
    if not record:
        raise HTTPException(404, "Record not found")
    # Restore stock
    ft = db.query(FeedType).filter(FeedType.id == record.feed_type_id).first()
    if ft:
        ft.current_stock = (ft.current_stock or Decimal("0")) + record.quantity
    db.delete(record)
    db.commit()
    return {"success": True}


# ─── SUMMARY ──────────────────────────────────────────────────────────────────

@router.get("/feed/summary")
def feed_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    today = date.today()
    thirty_ago = today - timedelta(days=30)

    feed_types = db.query(FeedType).filter(
        FeedType.organization_id == org_id,
        FeedType.is_active == True,
    ).all()

    low_stock = [f for f in feed_types if (f.min_stock_level or 0) > 0 and (f.current_stock or 0) <= (f.min_stock_level or 0)]

    # Total consumption last 30 days per feed type
    consumption_rows = (
        db.query(
            FeedConsumption.feed_type_id,
            func.sum(FeedConsumption.quantity).label("total_qty"),
        )
        .filter(
            FeedConsumption.organization_id == org_id,
            FeedConsumption.consumption_date >= thirty_ago,
        )
        .group_by(FeedConsumption.feed_type_id)
        .all()
    )
    consumption_map = {str(r.feed_type_id): float(r.total_qty) for r in consumption_rows}

    # Monthly consumption trend (last 6 months)
    monthly = []
    for i in range(5, -1, -1):
        from calendar import monthrange
        import calendar as cal
        m_date = today.replace(day=1) - timedelta(days=1) if i > 0 else today
        # Simple: go back i months
        mo = today.month - i
        yr = today.year
        while mo <= 0:
            mo += 12
            yr -= 1
        first = date(yr, mo, 1)
        last = date(yr, mo, cal.monthrange(yr, mo)[1])
        total = db.query(func.coalesce(func.sum(FeedConsumption.quantity), 0)).filter(
            FeedConsumption.organization_id == org_id,
            FeedConsumption.consumption_date >= first,
            FeedConsumption.consumption_date <= last,
        ).scalar() or 0
        monthly.append({"month": f"{yr}-{mo:02d}", "total_qty": round(float(total), 2)})

    feed_type_consumption = [
        {
            "feed_type_id": str(ft.id),
            "name": ft.name,
            "unit": ft.unit,
            "current_stock": float(ft.current_stock or 0),
            "min_stock_level": float(ft.min_stock_level or 0),
            "consumed_30d": consumption_map.get(str(ft.id), 0),
            "is_low": (ft.min_stock_level or 0) > 0 and (ft.current_stock or 0) <= (ft.min_stock_level or 0),
        }
        for ft in feed_types
    ]

    return {
        "success": True,
        "data": {
            "total_feed_types": len(feed_types),
            "low_stock_count": len(low_stock),
            "feed_type_consumption": feed_type_consumption,
            "monthly_trend": monthly,
        },
    }


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _get_feed_type(feed_type_id: str, org_id: str, db: Session) -> FeedType:
    ft = db.query(FeedType).filter(
        FeedType.id == feed_type_id,
        FeedType.organization_id == org_id,
    ).first()
    if not ft:
        raise HTTPException(404, "Feed type not found")
    return ft


def _feed_type_dict(ft: FeedType) -> dict:
    return {
        "id": str(ft.id),
        "name": ft.name,
        "unit": ft.unit,
        "current_stock": float(ft.current_stock or 0),
        "min_stock_level": float(ft.min_stock_level or 0),
        "cost_per_unit": float(ft.cost_per_unit) if ft.cost_per_unit else None,
        "suitable_for": ft.suitable_for,
        "description": ft.description,
        "is_active": ft.is_active,
        "is_low_stock": (ft.min_stock_level or 0) > 0 and (ft.current_stock or 0) <= (ft.min_stock_level or 0),
        "created_at": ft.created_at.isoformat() if ft.created_at else None,
    }


def _stock_tx_dict(tx: FeedStockTransaction) -> dict:
    return {
        "id": str(tx.id),
        "feed_type_id": str(tx.feed_type_id),
        "feed_type_name": tx.feed_type.name if tx.feed_type else None,
        "transaction_type": tx.transaction_type,
        "quantity": float(tx.quantity),
        "unit_cost": float(tx.unit_cost) if tx.unit_cost else None,
        "total_cost": float(tx.total_cost) if tx.total_cost else None,
        "reference": tx.reference,
        "notes": tx.notes,
        "transaction_date": tx.transaction_date.isoformat() if tx.transaction_date else None,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    }


def _consumption_dict(r: FeedConsumption) -> dict:
    return {
        "id": str(r.id),
        "feed_type_id": str(r.feed_type_id),
        "feed_type_name": r.feed_type.name if r.feed_type else None,
        "feed_type_unit": r.feed_type.unit if r.feed_type else None,
        "animal_id": str(r.animal_id) if r.animal_id else None,
        "animal_code": r.animal.animal_code if r.animal else None,
        "species": r.species.value if r.species else None,
        "quantity": float(r.quantity),
        "consumption_date": r.consumption_date.isoformat() if r.consumption_date else None,
        "session": r.session.value if r.session else None,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
