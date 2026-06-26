from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import date, timedelta
from decimal import Decimal
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    MilkProduction, MilkSale, User, Farm, SystemSettings, Animal,
    ChartOfAccount, JournalEntry, JournalEntryLine, Vendor, Customer,
)
from app.schemas.schemas import (
    MilkProductionCreate, MilkProductionOut,
    MilkSaleCreate, MilkSaleOut, MilkImportRow, MilkSaleImportRow,
)

DEFAULT_MILK_PRICE = Decimal("120")

router = APIRouter(tags=["Dairy"])
milk_router = APIRouter(prefix="/milk-productions")
sale_router = APIRouter(prefix="/milk-sales")


def get_org(u): return u.organization_id


def _get_milk_price(db: Session, org_id: str) -> Decimal:
    setting = db.query(SystemSettings).filter(
        SystemSettings.organization_id == org_id,
        SystemSettings.key == "milk_price_per_liter"
    ).first()
    try:
        return Decimal(setting.value) if setting and setting.value else DEFAULT_MILK_PRICE
    except Exception:
        return DEFAULT_MILK_PRICE


def _get_account(db: Session, org_id: str, code: str):
    return db.query(ChartOfAccount).filter(
        ChartOfAccount.organization_id == org_id,
        ChartOfAccount.account_code == code,
        ChartOfAccount.is_active == True,
    ).first()


def _next_entry_number(db: Session, org_id: str) -> str:
    n = db.query(func.count(JournalEntry.id)).filter(
        JournalEntry.organization_id == org_id
    ).scalar() or 0
    return f"MS-{n + 1:04d}"


def _create_sale_journal_entry(db: Session, sale: MilkSale, org_id: str, user_id: str):
    """
    Cash  → DR 1000 Cash in Hand,       CR 4000 Milk Sales Revenue
    Credit→ DR 1100 Accounts Receivable, CR 4000 Milk Sales Revenue
    """
    debit_code = "1000" if sale.payment_method == "cash" else "1100"
    debit_acc = _get_account(db, org_id, debit_code)
    credit_acc = _get_account(db, org_id, "4000")

    if not debit_acc or not credit_acc:
        return None  # chart of accounts not set up — skip silently

    entry = JournalEntry(
        organization_id=org_id,
        entry_number=_next_entry_number(db, org_id),
        entry_date=sale.sale_date,
        description=f"Milk sale — {sale.payment_method} — PKR {sale.total_amount}",
        reference=str(sale.id),
        status="posted",
        total_debit=sale.total_amount,
        total_credit=sale.total_amount,
        created_by=user_id,
    )
    db.add(entry)
    db.flush()

    db.add(JournalEntryLine(
        entry_id=entry.id,
        account_id=debit_acc.id,
        description=f"Milk sale ({sale.payment_method})",
        debit_amount=sale.total_amount,
        credit_amount=Decimal("0"),
    ))
    db.add(JournalEntryLine(
        entry_id=entry.id,
        account_id=credit_acc.id,
        description="Milk sales revenue",
        debit_amount=Decimal("0"),
        credit_amount=sale.total_amount,
    ))
    return entry


# ─── MILK PRODUCTION ───────────────────────────────────

@milk_router.get("")
def list_milk(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    animal_id: Optional[str] = None,
    session: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MilkProduction).filter(MilkProduction.organization_id == get_org(current_user))
    if animal_id:
        query = query.filter(MilkProduction.animal_id == animal_id)
    if session:
        query = query.filter(MilkProduction.session == session)
    if date_from:
        query = query.filter(MilkProduction.production_date >= date_from)
    if date_to:
        query = query.filter(MilkProduction.production_date <= date_to)
    total = query.count()
    items = (
        query.options(joinedload(MilkProduction.animal))
        .order_by(MilkProduction.production_date.desc())
        .offset((page - 1) * per_page).limit(per_page).all()
    )

    def _out(m: MilkProduction) -> dict:
        d = MilkProductionOut.from_orm(m).dict()
        if m.animal:
            d["animal_code"] = m.animal.animal_code
            d["animal_name"] = m.animal.name
            d["animal_species"] = (
                m.animal.species.value if hasattr(m.animal.species, "value")
                else str(m.animal.species)
            )
        return d

    return {"success": True, "data": {"total": total, "items": [_out(m) for m in items]}}


@milk_router.post("")
def create_milk(
    payload: MilkProductionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = get_org(current_user)
    farm = db.query(Farm).filter(Farm.organization_id == org_id).first()
    m = MilkProduction(
        organization_id=org_id,
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
    return {"success": True, "data": [
        {"date": str(r.production_date), "total_liters": float(r.total_liters)}
        for r in results
    ]}


@milk_router.put("/{milk_id}")
def update_milk(milk_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(MilkProduction).filter(
        MilkProduction.id == milk_id,
        MilkProduction.organization_id == get_org(current_user)
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(m, k):
            setattr(m, k, v)
    db.commit()
    return {"success": True, "data": MilkProductionOut.from_orm(m)}


@milk_router.delete("/{milk_id}")
def delete_milk(milk_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(MilkProduction).filter(
        MilkProduction.id == milk_id,
        MilkProduction.organization_id == get_org(current_user)
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(m)
    db.commit()
    return {"success": True, "message": "Deleted"}


@milk_router.post("/import")
def import_milk(
    payload: List[MilkImportRow],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = get_org(current_user)
    farm = db.query(Farm).filter(Farm.organization_id == org_id).first()

    codes = list({r.animal_code for r in payload})
    animals = db.query(Animal).filter(
        Animal.organization_id == org_id,
        Animal.animal_code.in_(codes),
        Animal.is_active == True
    ).all()
    animal_map = {a.animal_code: a.id for a in animals}

    created = skipped = 0
    errors: list = []

    def _make_record(animal_id, row, session, qty):
        m = MilkProduction(
            organization_id=org_id,
            farm_id=farm.id if farm else None,
            animal_id=animal_id,
            production_date=row.production_date,
            session=session,
            quantity_liters=qty,
            fat_percentage=row.fat_percentage,
            remarks=row.remarks,
            recorded_by=current_user.id,
        )
        db.add(m)

    for i, row in enumerate(payload):
        animal_id = animal_map.get(row.animal_code)
        if not animal_id:
            errors.append(f"Row {i + 1}: Animal code '{row.animal_code}' not found — skipped")
            skipped += 1
            continue

        session_val = row.session.lower().strip()
        if session_val == "both":
            half = Decimal(str(row.quantity_liters)) / 2
            _make_record(animal_id, row, "morning", half)
            _make_record(animal_id, row, "evening", half)
            created += 2
        elif session_val in ("morning", "evening"):
            _make_record(animal_id, row, session_val, Decimal(str(row.quantity_liters)))
            created += 1
        else:
            errors.append(f"Row {i + 1}: Invalid session '{row.session}' — use morning/evening/both")
            skipped += 1

    db.commit()
    return {"success": True, "created": created, "skipped": skipped, "errors": errors}


# ─── MILK SALES ────────────────────────────────────────

def _sale_out(s: MilkSale) -> dict:
    d = MilkSaleOut.from_orm(s).dict()
    d["vendor_name"] = s.vendor.name if s.vendor else None
    d["customer_id"] = str(s.customer_id) if s.customer_id else None
    d["customer_name"] = s.customer.name if s.customer else None
    return d


@sale_router.get("/summary")
def sales_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    payment_method: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import date as date_cls
    today = date_cls.today()
    effective_from = date_from or today.replace(day=1)
    effective_to   = date_to   or today

    query = db.query(MilkSale).filter(
        MilkSale.organization_id == get_org(current_user),
        MilkSale.sale_date >= effective_from,
        MilkSale.sale_date <= effective_to,
    )
    if payment_method:
        query = query.filter(MilkSale.payment_method == payment_method)
    if customer_id:
        query = query.filter(MilkSale.customer_id == customer_id)

    rows = query.all()
    total_revenue  = sum(float(r.total_amount) for r in rows)
    cash_revenue   = sum(float(r.total_amount) for r in rows if r.payment_method == "cash")
    credit_revenue = sum(float(r.total_amount) for r in rows if r.payment_method == "credit")

    return {
        "success": True,
        "data": {
            "date_from":      str(effective_from),
            "date_to":        str(effective_to),
            "total_revenue":  total_revenue,
            "cash_revenue":   cash_revenue,
            "credit_revenue": credit_revenue,
            "count":          len(rows),
        }
    }


@sale_router.get("")
def list_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    payment_method: Optional[str] = None,
    vendor_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MilkSale).filter(MilkSale.organization_id == get_org(current_user))
    if date_from:
        query = query.filter(MilkSale.sale_date >= date_from)
    if date_to:
        query = query.filter(MilkSale.sale_date <= date_to)
    if payment_method:
        query = query.filter(MilkSale.payment_method == payment_method)
    if vendor_id:
        query = query.filter(MilkSale.vendor_id == vendor_id)
    if customer_id:
        query = query.filter(MilkSale.customer_id == customer_id)
    total = query.count()
    items = (
        query.options(joinedload(MilkSale.vendor), joinedload(MilkSale.customer))
        .order_by(MilkSale.sale_date.desc())
        .offset((page - 1) * per_page).limit(per_page).all()
    )
    return {"success": True, "data": {"total": total, "items": [_sale_out(s) for s in items]}}


@sale_router.post("")
def create_sale(
    payload: MilkSaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = get_org(current_user)
    qty = Decimal(str(payload.quantity_liters))
    price = Decimal(str(payload.price_per_liter))
    total = payload.total_amount if payload.total_amount else qty * price

    s = MilkSale(
        organization_id=org_id,
        sale_date=payload.sale_date,
        buyer_name=payload.buyer_name,
        vendor_id=payload.vendor_id,
        customer_id=payload.customer_id,
        quantity_liters=qty,
        price_per_liter=price,
        total_amount=total,
        payment_method=payload.payment_method,
        payment_status=payload.payment_status,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(s)
    db.flush()

    entry = _create_sale_journal_entry(db, s, org_id, current_user.id)
    if entry:
        s.journal_entry_id = entry.id

    db.commit()
    db.refresh(s)
    return {"success": True, "data": _sale_out(s)}


@sale_router.put("/{sale_id}")
def update_sale(sale_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(MilkSale).filter(
        MilkSale.id == sale_id,
        MilkSale.organization_id == get_org(current_user)
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(s, k):
            setattr(s, k, v)
    db.commit()
    return {"success": True, "data": _sale_out(s)}


@sale_router.delete("/{sale_id}")
def delete_sale(sale_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(MilkSale).filter(
        MilkSale.id == sale_id,
        MilkSale.organization_id == get_org(current_user)
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return {"success": True, "message": "Deleted"}


@sale_router.post("/import")
def import_sales(
    payload: List[MilkSaleImportRow],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = get_org(current_user)
    created = skipped = 0
    errors: list = []

    for i, row in enumerate(payload):
        pm = (row.payment_method or "cash").lower().strip()
        if pm not in ("cash", "credit"):
            errors.append(f"Row {i + 1}: Invalid payment_method '{row.payment_method}' — use cash/credit")
            skipped += 1
            continue

        qty = Decimal(str(row.quantity_liters))
        price = Decimal(str(row.price_per_liter))
        total = qty * price

        s = MilkSale(
            organization_id=org_id,
            sale_date=row.sale_date,
            buyer_name=row.buyer_name or None,
            quantity_liters=qty,
            price_per_liter=price,
            total_amount=total,
            payment_method=pm,
            payment_status="paid",
            notes=row.notes or None,
        )
        db.add(s)
        db.flush()

        try:
            _create_sale_journal_entry(db, s, org_id, current_user.id)
        except Exception:
            pass  # journal entry optional — don't fail the import

        created += 1

    db.commit()
    return {"success": True, "created": created, "skipped": skipped, "errors": errors}


router.include_router(milk_router)
router.include_router(sale_router)
