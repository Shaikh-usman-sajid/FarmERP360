from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
import uuid as uuid_lib
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import (
    Investor, InvestorCapital, PallaiCustomer, PallaiPackage,
    PallaiSubscription, Invoice, InvoiceLineItem, Payment, User, UserRole, InvoiceStatus
)
from decimal import Decimal
from app.schemas.schemas import (
    InvestorCreate, InvestorOut, InvestorCapitalCreate,
    PallaiCustomerCreate, PallaiCustomerOut, PallaiCustomerUpdate,
    PallaiPackageCreate, PallaiPackageOut, PallaiPackageUpdate,
    InvoiceCreate, InvoiceOut, PaymentCreate, PaymentOut
)
from app.models.models import Invoice as InvoiceModel

router = APIRouter(tags=["Business"])


def get_org(u): return u.organization_id


# ─── INVESTORS ─────────────────────────────────────────

inv_router = APIRouter(prefix="/investors")


@inv_router.get("")
def list_investors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Investor).filter(Investor.organization_id == get_org(current_user), Investor.is_active == True).all()
    return {"success": True, "data": [InvestorOut.from_orm(i) for i in items]}


@inv_router.get("/{inv_id}")
def get_investor(inv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Investor).filter(Investor.id == inv_id, Investor.organization_id == get_org(current_user)).first()
    if not i:
        raise HTTPException(status_code=404, detail="Investor not found")
    return {"success": True, "data": InvestorOut.from_orm(i)}


@inv_router.post("")
def create_investor(
    payload: InvestorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OWNER))
):
    i = Investor(organization_id=get_org(current_user), **payload.dict())
    db.add(i)
    db.commit()
    db.refresh(i)
    return {"success": True, "data": InvestorOut.from_orm(i)}


@inv_router.put("/{inv_id}")
def update_investor(inv_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Investor).filter(Investor.id == inv_id, Investor.organization_id == get_org(current_user)).first()
    if not i:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(i, k): setattr(i, k, v)
    db.commit()
    return {"success": True, "data": InvestorOut.from_orm(i)}


@inv_router.post("/capital")
def add_capital(payload: InvestorCapitalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    investor = db.query(Investor).filter(Investor.id == payload.investor_id, Investor.organization_id == get_org(current_user)).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    c = InvestorCapital(organization_id=get_org(current_user), **payload.dict())
    db.add(c)
    investor.total_capital = (investor.total_capital or 0) + payload.amount
    db.commit()
    return {"success": True, "message": "Capital added"}


@inv_router.get("/{inv_id}/portfolio")
def get_portfolio(inv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import AnimalOwnership, Animal
    ownerships = db.query(AnimalOwnership).filter(
        AnimalOwnership.owner_user_id == inv_id,
        AnimalOwnership.is_current == True
    ).all()
    return {"success": True, "data": {"ownerships": len(ownerships), "items": [{"animal_id": o.animal_id, "percentage": float(o.ownership_percentage)} for o in ownerships]}}


# ─── PALLAI CUSTOMERS ──────────────────────────────────

pallai_router = APIRouter(prefix="/pallai-customers")
pkg_router = APIRouter(prefix="/pallai-packages")


@pallai_router.get("")
def list_pallai(
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import or_
    q = db.query(PallaiCustomer).filter(PallaiCustomer.organization_id == get_org(current_user))
    if is_active is not None:
        q = q.filter(PallaiCustomer.is_active == is_active)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            PallaiCustomer.full_name.ilike(term),
            PallaiCustomer.phone.ilike(term),
            PallaiCustomer.cnic.ilike(term),
        ))
    items = q.order_by(PallaiCustomer.full_name).all()
    return {"success": True, "data": [PallaiCustomerOut.from_orm(c) for c in items]}


@pallai_router.post("", status_code=201)
def create_pallai_customer(payload: PallaiCustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = PallaiCustomer(id=str(uuid_lib.uuid4()), organization_id=get_org(current_user), **payload.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"success": True, "data": PallaiCustomerOut.from_orm(c)}


@pallai_router.get("/ledger-summary")
def customers_ledger_summary_business(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated ledger totals for all Pallai customers (used by ledger page)."""
    org_id = get_org(current_user)
    customers = db.query(PallaiCustomer).filter(PallaiCustomer.organization_id == org_id).order_by(PallaiCustomer.full_name).all()
    result = []
    for c in customers:
        invoices = db.query(InvoiceModel).filter(InvoiceModel.organization_id == org_id, InvoiceModel.customer_id == c.id).all()
        total_billed = sum(float(inv.total_amount or 0) for inv in invoices)
        total_paid = sum(float(inv.paid_amount or 0) for inv in invoices)
        outstanding = round(total_billed - total_paid, 2)
        last_date = max((inv.issue_date for inv in invoices), default=None)
        result.append({
            "id": c.id,
            "full_name": c.full_name,
            "phone": c.phone or "",
            "email": c.email or "",
            "address": c.address or "",
            "cnic": c.cnic or "",
            "is_active": c.is_active,
            "total_billed": total_billed,
            "total_paid": total_paid,
            "outstanding": outstanding,
            "invoice_count": len(invoices),
            "last_invoice_date": str(last_date) if last_date else None,
        })
    return {"data": result}


@pallai_router.get("/{cust_id}")
def get_pallai_customer(cust_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(PallaiCustomer).filter(PallaiCustomer.id == cust_id, PallaiCustomer.organization_id == get_org(current_user)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"success": True, "data": PallaiCustomerOut.from_orm(c)}


@pallai_router.put("/{cust_id}")
def update_pallai(cust_id: str, payload: PallaiCustomerUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(PallaiCustomer).filter(PallaiCustomer.id == cust_id, PallaiCustomer.organization_id == get_org(current_user)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.dict(exclude_unset=True).items():
        if hasattr(c, k):
            setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return {"success": True, "data": PallaiCustomerOut.from_orm(c)}


@pkg_router.get("")
def list_packages(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PallaiPackage).filter(PallaiPackage.organization_id == get_org(current_user))
    if is_active is not None:
        q = q.filter(PallaiPackage.is_active == is_active)
    items = q.order_by(PallaiPackage.name).all()
    return {"success": True, "data": [PallaiPackageOut.from_orm(p) for p in items]}


@pkg_router.post("", status_code=201)
def create_package(payload: PallaiPackageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = PallaiPackage(id=str(uuid_lib.uuid4()), organization_id=get_org(current_user), **payload.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"success": True, "data": PallaiPackageOut.from_orm(p)}


@pkg_router.get("/{pkg_id}")
def get_package(pkg_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(PallaiPackage).filter(PallaiPackage.id == pkg_id, PallaiPackage.organization_id == get_org(current_user)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"success": True, "data": PallaiPackageOut.from_orm(p)}


@pkg_router.put("/{pkg_id}")
def update_package_route(pkg_id: str, payload: PallaiPackageUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(PallaiPackage).filter(PallaiPackage.id == pkg_id, PallaiPackage.organization_id == get_org(current_user)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Package not found")
    for k, v in payload.dict(exclude_unset=True).items():
        if hasattr(p, k):
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return {"success": True, "data": PallaiPackageOut.from_orm(p)}


# ─── INVOICES ──────────────────────────────────────────

inv_invoice_router = APIRouter(prefix="/invoices")


def gen_invoice_number():
    return f"INV-{str(uuid_lib.uuid4())[:8].upper()}"


@inv_invoice_router.get("")
def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice).filter(Invoice.organization_id == get_org(current_user))
    if status:
        query = query.filter(Invoice.status == status)
    total = query.count()
    items = query.order_by(Invoice.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [InvoiceOut.from_orm(i) for i in items]}}


@inv_invoice_router.get("/{inv_id}")
def get_invoice(inv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id, Invoice.organization_id == get_org(current_user)).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = InvoiceOut.from_orm(inv).dict()
    data["line_items"] = [{"description": li.description, "quantity": float(li.quantity), "unit_price": float(li.unit_price), "total": float(li.total)} for li in inv.line_items]
    return {"success": True, "data": data}


@inv_invoice_router.post("")
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Customer
    customer_name = payload.customer_name
    customer_id = payload.customer_id
    if customer_id:
        cust = db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.organization_id == get_org(current_user),
        ).first()
        if cust:
            customer_name = customer_name or cust.name
    subtotal = sum(li.total for li in payload.line_items)
    inv = Invoice(
        organization_id=get_org(current_user),
        invoice_number=gen_invoice_number(),
        customer_id=customer_id,
        customer_name=customer_name,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        subtotal=subtotal,
        total_amount=subtotal,
        notes=payload.notes,
        created_by=current_user.id
    )
    db.add(inv)
    db.flush()
    for li_data in payload.line_items:
        li = InvoiceLineItem(invoice_id=inv.id, **li_data.dict())
        db.add(li)
    db.commit()
    db.refresh(inv)
    return {"success": True, "data": InvoiceOut.from_orm(inv)}


@inv_invoice_router.put("/{inv_id}")
def update_invoice(inv_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id, Invoice.organization_id == get_org(current_user)).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(inv, k): setattr(inv, k, v)
    db.commit()
    return {"success": True, "data": InvoiceOut.from_orm(inv)}


# ─── PAYMENTS ──────────────────────────────────────────

pay_router = APIRouter(prefix="/payments")


def _payment_out(p: Payment) -> dict:
    from app.models.models import Customer
    d = PaymentOut.from_orm(p).dict()
    if p.customer:
        d["customer_name"] = p.customer.name
    elif p.invoice and p.invoice.customer_name:
        d["customer_name"] = p.invoice.customer_name
    return d


@pay_router.get("")
def list_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    search: Optional[str] = None,
    payment_method: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload
    from sqlalchemy import or_
    query = db.query(Payment).options(
        joinedload(Payment.invoice), joinedload(Payment.customer)
    ).filter(Payment.organization_id == get_org(current_user))
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Payment.reference.ilike(like), Payment.notes.ilike(like)))
    if payment_method:
        query = query.filter(Payment.payment_method == payment_method)
    if date_from:
        query = query.filter(Payment.payment_date >= date_from)
    if date_to:
        query = query.filter(Payment.payment_date <= date_to)
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)
    total = query.count()
    items = query.order_by(Payment.payment_date.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [_payment_out(p) for p in items]}}


@pay_router.post("")
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Customer
    from sqlalchemy.orm import joinedload
    customer_name = payload.customer_name
    customer_id = payload.customer_id
    if customer_id:
        cust = db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.organization_id == get_org(current_user),
        ).first()
        if cust:
            customer_name = customer_name or cust.name
    p = Payment(
        organization_id=get_org(current_user),
        created_by=current_user.id,
        invoice_id=payload.invoice_id or None,
        customer_id=customer_id,
        customer_name=customer_name,
        amount=payload.amount,
        payment_date=payload.payment_date,
        payment_method=payload.payment_method,
        reference=payload.reference,
        notes=payload.notes,
    )
    db.add(p)
    if payload.invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
        if inv:
            inv.paid_amount = (inv.paid_amount or 0) + payload.amount
            if inv.paid_amount >= inv.total_amount:
                inv.status = InvoiceStatus.PAID
    db.commit()
    db.refresh(p)
    p = db.query(Payment).options(joinedload(Payment.invoice), joinedload(Payment.customer)).filter(Payment.id == p.id).first()
    return {"success": True, "data": _payment_out(p)}


router.include_router(inv_router)
router.include_router(pallai_router)
router.include_router(pkg_router)
router.include_router(inv_invoice_router)
router.include_router(pay_router)
