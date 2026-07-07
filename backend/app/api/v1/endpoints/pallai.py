from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
import calendar
import uuid as uuid_lib
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import (
    PallaiCustomer, PallaiPackage, PallaiSubscription,
    Invoice, InvoiceLineItem, Payment, User, InvoiceStatus, Animal,
    ChartOfAccount, JournalEntry, JournalEntryLine, JournalEntryStatus,
)
from app.schemas.schemas import (
    PallaiSubscriptionCreate, PallaiSubscriptionOut,
    PallaiPackageOut, InvoiceOut, PallaiLedgerEntry
)

# ─────────────────────────────────────────────
# SUB-ROUTERS
# ─────────────────────────────────────────────

sub_router = APIRouter(prefix="/pallai-subscriptions", tags=["Pallai"])
customer_sub_router = APIRouter(prefix="/pallai-customers", tags=["Pallai"])
billing_router = APIRouter(prefix="/pallai", tags=["Pallai"])
portal_router = APIRouter(prefix="/pallai/portal", tags=["Pallai"])
reports_router = APIRouter(prefix="/pallai", tags=["Pallai"])


def _enrich_subscription(sub: PallaiSubscription) -> PallaiSubscriptionOut:
    """Build PallaiSubscriptionOut with denormalized name fields."""
    data = PallaiSubscriptionOut(
        id=sub.id,
        customer_id=sub.customer_id,
        animal_id=sub.animal_id,
        package_id=sub.package_id,
        start_date=sub.start_date,
        end_date=sub.end_date,
        monthly_fee=sub.monthly_fee,
        is_active=sub.is_active,
        notes=getattr(sub, "notes", None),
        created_at=sub.created_at,
        customer_name=sub.customer.full_name if sub.customer else None,
        animal_name=sub.animal.name if sub.animal else None,
        package_name=sub.package.name if sub.package else None,
    )
    return data


# ─────────────────────────────────────────────
# SUBSCRIPTION ENDPOINTS
# ─────────────────────────────────────────────

def _next_je_number(org_id: str, db: Session) -> str:
    count = db.query(JournalEntry).filter_by(organization_id=org_id).count()
    return f"JE-{count + 1:05d}"


def _post_subscription_je(db: Session, sub, customer, package, current_user):
    """Create and post a journal entry for a new Pallai subscription:
       DR Pallai Receivable (1110) / CR Pallai Service Revenue (4200).
       Silently skips if either account is missing — admin must set up CoA first."""
    org_id = current_user.organization_id
    ar_acct = db.query(ChartOfAccount).filter_by(
        organization_id=org_id, account_code="1110", is_active=True
    ).first()
    rev_acct = db.query(ChartOfAccount).filter_by(
        organization_id=org_id, account_code="4200", is_active=True
    ).first()
    if not ar_acct or not rev_acct:
        return  # CoA not set up yet; skip silently

    amount = Decimal(str(sub.monthly_fee or 0))
    if amount <= 0:
        return

    entry_date = sub.start_date if isinstance(sub.start_date, date) else date.today()
    description = (
        f"Pallai subscription — {customer.full_name} / {package.name}"
    )

    entry = JournalEntry(
        organization_id=org_id,
        entry_number=_next_je_number(org_id, db),
        entry_date=entry_date,
        description=description,
        reference=f"SUB-{sub.id[:8].upper()}",
        status=JournalEntryStatus.POSTED,
        total_debit=amount,
        total_credit=amount,
        created_by=current_user.id,
    )
    db.add(entry)
    db.flush()

    db.add(JournalEntryLine(
        entry_id=entry.id,
        account_id=ar_acct.id,
        description=f"Receivable — {customer.full_name}",
        debit_amount=amount,
        credit_amount=Decimal("0"),
    ))
    db.add(JournalEntryLine(
        entry_id=entry.id,
        account_id=rev_acct.id,
        description=f"Revenue — {package.name}",
        debit_amount=Decimal("0"),
        credit_amount=amount,
    ))
    db.commit()


@sub_router.get("")
def list_subscriptions(
    is_active: Optional[bool] = Query(None),
    customer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "farm_manager", "accountant"])
    ),
):
    q = db.query(PallaiSubscription).filter(
        PallaiSubscription.organization_id == current_user.organization_id
    )
    if is_active is not None:
        q = q.filter(PallaiSubscription.is_active == is_active)
    if customer_id:
        q = q.filter(PallaiSubscription.customer_id == customer_id)
    subs = q.order_by(PallaiSubscription.created_at.desc()).all()
    return {"success": True, "data": [_enrich_subscription(s).dict() for s in subs]}


@sub_router.post("", status_code=201)
def create_subscription(
    payload: PallaiSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "farm_manager", "accountant"])
    ),
):
    """Create a new Pallai subscription."""
    # Validate customer belongs to this org
    customer = db.query(PallaiCustomer).filter(
        PallaiCustomer.id == payload.customer_id,
        PallaiCustomer.organization_id == current_user.organization_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Validate animal belongs to this org
    animal = db.query(Animal).filter(
        Animal.id == payload.animal_id,
        Animal.organization_id == current_user.organization_id,
    ).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    # Validate package belongs to this org
    package = db.query(PallaiPackage).filter(
        PallaiPackage.id == payload.package_id,
        PallaiPackage.organization_id == current_user.organization_id,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    sub = PallaiSubscription(
        id=str(uuid_lib.uuid4()),
        organization_id=current_user.organization_id,
        customer_id=payload.customer_id,
        animal_id=payload.animal_id,
        package_id=payload.package_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        monthly_fee=payload.monthly_fee if payload.monthly_fee is not None else package.price,
        is_active=True,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    # Auto-post journal entry: DR Pallai Receivable / CR Pallai Service Revenue
    _post_subscription_je(db, sub, customer, package, current_user)

    return {"success": True, "data": _enrich_subscription(sub).dict()}


@sub_router.get("/{sub_id}")
def get_subscription(
    sub_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "farm_manager", "accountant"])
    ),
):
    """Get a single Pallai subscription by ID."""
    sub = db.query(PallaiSubscription).filter(
        PallaiSubscription.id == sub_id,
        PallaiSubscription.organization_id == current_user.organization_id,
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"success": True, "data": _enrich_subscription(sub).dict()}


@sub_router.put("/{sub_id}")
def update_subscription(
    sub_id: str,
    end_date: Optional[date] = Body(None),
    monthly_fee: Optional[Decimal] = Body(None),
    notes: Optional[str] = Body(None),
    is_active: Optional[bool] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "farm_manager", "accountant"])
    ),
):
    """Update a Pallai subscription (end_date, monthly_fee, notes, is_active)."""
    sub = db.query(PallaiSubscription).filter(
        PallaiSubscription.id == sub_id,
        PallaiSubscription.organization_id == current_user.organization_id,
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if end_date is not None:
        sub.end_date = end_date
    if monthly_fee is not None:
        sub.monthly_fee = monthly_fee
    if notes is not None and hasattr(sub, "notes"):
        sub.notes = notes
    if is_active is not None:
        sub.is_active = is_active

    db.commit()
    db.refresh(sub)
    return {"success": True, "data": _enrich_subscription(sub).dict()}


# ─────────────────────────────────────────────
# CUSTOMER-SPECIFIC ENDPOINTS
# (CRUD is handled by business.py pallai_router)
# ─────────────────────────────────────────────

@customer_sub_router.get("/{cust_id}/subscriptions")
def customer_subscriptions(
    cust_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "farm_manager", "accountant"])
    ),
):
    """List all subscriptions for a specific customer."""
    customer = db.query(PallaiCustomer).filter(
        PallaiCustomer.id == cust_id,
        PallaiCustomer.organization_id == current_user.organization_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    subs = db.query(PallaiSubscription).filter(
        PallaiSubscription.customer_id == cust_id,
        PallaiSubscription.organization_id == current_user.organization_id,
    ).order_by(PallaiSubscription.start_date.desc()).all()
    return {"success": True, "data": [_enrich_subscription(s).dict() for s in subs]}


@customer_sub_router.get("/{cust_id}/ledger")
def customer_ledger(
    cust_id: str,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "farm_manager", "accountant"])
    ),
):
    """Financial ledger for a customer: all invoices with running balance."""
    customer = db.query(PallaiCustomer).filter(
        PallaiCustomer.id == cust_id,
        PallaiCustomer.organization_id == current_user.organization_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    q = db.query(Invoice).filter(
        Invoice.organization_id == current_user.organization_id,
        Invoice.customer_id == cust_id,
    )
    if date_from:
        q = q.filter(Invoice.issue_date >= date_from)
    if date_to:
        q = q.filter(Invoice.issue_date <= date_to)
    if status:
        q = q.filter(Invoice.status == status)
    invoices = q.order_by(Invoice.issue_date.asc(), Invoice.created_at.asc()).all()

    entries = []
    running_balance = Decimal("0.00")
    for inv in invoices:
        amount = inv.total_amount or Decimal("0.00")
        paid = inv.paid_amount or Decimal("0.00")
        running_balance += amount - paid
        entries.append({
            "date": str(inv.issue_date),
            "description": f"Invoice {inv.invoice_number}",
            "invoice_number": inv.invoice_number,
            "amount": float(amount),
            "paid_amount": float(paid),
            "balance": float(running_balance),
            "status": inv.status.value if inv.status else "draft",
        })
    return {"success": True, "data": entries}


# ─────────────────────────────────────────────
# RECURRING BILLING
# ─────────────────────────────────────────────

@billing_router.post("/billing/generate")
def generate_monthly_invoices(
    billing_month: str = Body(..., description="Format: YYYY-MM"),
    subscription_ids: Optional[List[str]] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "accountant"])
    ),
):
    """
    Generate monthly invoices for active Pallai subscriptions.
    Skips subscriptions that already have an invoice for the given billing_month.
    """
    # Parse billing_month
    try:
        year, month = billing_month.split("-")
        year = int(year)
        month = int(month)
        if not (1 <= month <= 12):
            raise ValueError
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=422, detail="billing_month must be in YYYY-MM format"
        )

    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    # Query active subscriptions in this org
    q = db.query(PallaiSubscription).filter(
        PallaiSubscription.organization_id == current_user.organization_id,
        PallaiSubscription.is_active == True,
    )
    if subscription_ids:
        q = q.filter(PallaiSubscription.id.in_(subscription_ids))
    subscriptions = q.all()

    generated_count = 0
    for subscription in subscriptions:
        # Check for existing invoice for this subscription + billing_month
        existing = db.query(Invoice).filter(
            Invoice.subscription_id == subscription.id,
            Invoice.issue_date == first_day,
        ).first()
        if existing:
            continue

        monthly_fee = subscription.monthly_fee or Decimal("0.00")
        animal_name = subscription.animal.name if subscription.animal else "Unknown Animal"
        package_name = subscription.package.name if subscription.package else "Unknown Package"
        customer_name = subscription.customer.full_name if subscription.customer else "Unknown Customer"

        invoice_number = f"PAL-{billing_month}-{subscription.id[:6].upper()}"

        invoice = Invoice(
            id=str(uuid_lib.uuid4()),
            organization_id=current_user.organization_id,
            invoice_number=invoice_number,
            customer_name=customer_name,
            customer_id=subscription.customer_id,
            issue_date=first_day,
            due_date=last_day,
            subtotal=monthly_fee,
            tax_amount=Decimal("0.00"),
            total_amount=monthly_fee,
            paid_amount=Decimal("0.00"),
            status=InvoiceStatus.DRAFT,
            subscription_id=subscription.id,
            created_by=current_user.id,
        )
        db.add(invoice)
        db.flush()  # Get invoice.id before creating line item

        line_item = InvoiceLineItem(
            id=str(uuid_lib.uuid4()),
            invoice_id=invoice.id,
            description=f"Pallai Subscription - {package_name} - {animal_name}",
            quantity=Decimal("1"),
            unit_price=monthly_fee,
            total=monthly_fee,
        )
        db.add(line_item)
        generated_count += 1

    db.commit()
    return {"success": True, "data": {
        "billing_month": billing_month,
        "invoices_generated": generated_count,
        "message": f"Generated {generated_count} invoice(s) for {billing_month}",
    }}


@billing_router.get("/billing/status")
def get_billing_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner", "accountant"])),
):
    """
    Returns billing automation status:
    - Current month: run or not, invoice count, total amount
    - Last 6 months history
    - Overdue invoice count
    """
    org_id = current_user.organization_id
    today = date.today()
    current_month_str = today.strftime("%Y-%m")
    current_first = date(today.year, today.month, 1)

    # Active subscriptions
    active_subs = db.query(PallaiSubscription).filter(
        PallaiSubscription.organization_id == org_id,
        PallaiSubscription.is_active == True,
    ).count()

    # Current month billing status
    current_invoices = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.subscription_id.isnot(None),
        Invoice.issue_date == current_first,
    ).all()
    current_total = sum(float(i.total_amount or 0) for i in current_invoices)

    # Overdue count (past due_date, not paid/cancelled, has subscription)
    overdue_count = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.subscription_id.isnot(None),
        Invoice.due_date < today,
        Invoice.status.notin_([InvoiceStatus.PAID, InvoiceStatus.CANCELLED]),
    ).count()

    # Last 6 months history
    history = []
    for i in range(5, -1, -1):
        # Walk back i months from current
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        first_day = date(y, m, 1)
        month_str = first_day.strftime("%Y-%m")
        rows = db.query(Invoice).filter(
            Invoice.organization_id == org_id,
            Invoice.subscription_id.isnot(None),
            Invoice.issue_date == first_day,
        ).all()
        history.append({
            "month": month_str,
            "invoices_generated": len(rows),
            "total_amount": sum(float(r.total_amount or 0) for r in rows),
            "is_current": month_str == current_month_str,
        })

    return {"success": True, "data": {
        "active_subscriptions": active_subs,
        "current_month": current_month_str,
        "current_month_invoices": len(current_invoices),
        "current_month_total": current_total,
        "current_month_run": len(current_invoices) > 0,
        "overdue_count": overdue_count,
        "history": history,
    }}


@billing_router.post("/billing/run-current")
def run_current_month_billing(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner", "accountant"])),
):
    """Auto-detect current month and generate invoices for all active subscriptions."""
    org_id = current_user.organization_id
    today = date.today()
    billing_month = today.strftime("%Y-%m")
    first_day = date(today.year, today.month, 1)
    last_day = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])

    subscriptions = db.query(PallaiSubscription).filter(
        PallaiSubscription.organization_id == org_id,
        PallaiSubscription.is_active == True,
    ).all()

    generated_count = 0
    skipped_count = 0
    for subscription in subscriptions:
        existing = db.query(Invoice).filter(
            Invoice.subscription_id == subscription.id,
            Invoice.issue_date == first_day,
        ).first()
        if existing:
            skipped_count += 1
            continue

        monthly_fee = subscription.monthly_fee or Decimal("0.00")
        animal_name = subscription.animal.name if subscription.animal else "Unknown Animal"
        package_name = subscription.package.name if subscription.package else "Unknown Package"
        customer_name = subscription.customer.full_name if subscription.customer else "Unknown Customer"
        invoice_number = f"PAL-{billing_month}-{subscription.id[:6].upper()}"

        invoice = Invoice(
            id=str(uuid_lib.uuid4()),
            organization_id=org_id,
            invoice_number=invoice_number,
            customer_name=customer_name,
            customer_id=subscription.customer_id,
            issue_date=first_day,
            due_date=last_day,
            subtotal=monthly_fee,
            tax_amount=Decimal("0.00"),
            total_amount=monthly_fee,
            paid_amount=Decimal("0.00"),
            status=InvoiceStatus.DRAFT,
            subscription_id=subscription.id,
            created_by=current_user.id,
        )
        db.add(invoice)
        db.flush()
        line_item = InvoiceLineItem(
            id=str(uuid_lib.uuid4()),
            invoice_id=invoice.id,
            description=f"Pallai Subscription - {package_name} - {animal_name}",
            quantity=Decimal("1"),
            unit_price=monthly_fee,
            total=monthly_fee,
        )
        db.add(line_item)
        generated_count += 1

    db.commit()
    return {"success": True, "data": {
        "billing_month": billing_month,
        "invoices_generated": generated_count,
        "skipped_existing": skipped_count,
        "message": f"Generated {generated_count} invoice(s) for {billing_month} ({skipped_count} skipped — already existed)",
    }}


@billing_router.post("/billing/mark-overdue")
def mark_overdue_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner", "accountant"])),
):
    """Mark all past-due Pallai subscription invoices as OVERDUE."""
    org_id = current_user.organization_id
    today = date.today()
    updated = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.subscription_id.isnot(None),
        Invoice.due_date < today,
        Invoice.status.in_([InvoiceStatus.DRAFT, InvoiceStatus.SENT]),
    ).update({"status": InvoiceStatus.OVERDUE}, synchronize_session=False)
    db.commit()
    return {"success": True, "data": {"marked_overdue": updated}}


# ─────────────────────────────────────────────
# CUSTOMER PORTAL
# ─────────────────────────────────────────────

def _get_portal_customer(current_user: User, db: Session) -> PallaiCustomer:
    """Resolve the PallaiCustomer record for the logged-in pallai_customer user."""
    customer = db.query(PallaiCustomer).filter(
        PallaiCustomer.user_id == current_user.id,
        PallaiCustomer.organization_id == current_user.organization_id,
    ).first()
    if not customer:
        raise HTTPException(
            status_code=404,
            detail="No Pallai customer profile linked to this account",
        )
    return customer


@portal_router.get("/me")
def portal_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["pallai_customer"])),
):
    """Customer profile with active subscription count and outstanding balance."""
    customer = _get_portal_customer(current_user, db)

    active_subs_count = db.query(func.count(PallaiSubscription.id)).filter(
        PallaiSubscription.customer_id == customer.id,
        PallaiSubscription.is_active == True,
    ).scalar() or 0

    # Outstanding balance = sum of (total_amount - paid_amount) on unpaid invoices
    outstanding = (
        db.query(
            func.sum(Invoice.total_amount - Invoice.paid_amount)
        )
        .filter(
            Invoice.customer_id == customer.id,
            Invoice.organization_id == current_user.organization_id,
            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.DRAFT]),
        )
        .scalar()
    ) or Decimal("0.00")

    return {"success": True, "data": {
        "id": customer.id,
        "full_name": customer.full_name,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
        "cnic": customer.cnic,
        "is_active": customer.is_active,
        "active_subscriptions_count": active_subs_count,
        "total_balance_due": float(outstanding),
    }}


@portal_router.get("/subscriptions")
def portal_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["pallai_customer"])),
):
    """List customer's subscriptions with animal and package details."""
    customer = _get_portal_customer(current_user, db)
    subs = (
        db.query(PallaiSubscription)
        .filter(
            PallaiSubscription.customer_id == customer.id,
            PallaiSubscription.organization_id == current_user.organization_id,
        )
        .order_by(PallaiSubscription.start_date.desc())
        .all()
    )
    return {"success": True, "data": [_enrich_subscription(s).dict() for s in subs]}


@portal_router.get("/invoices")
def portal_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["pallai_customer"])),
):
    """List customer's invoices."""
    customer = _get_portal_customer(current_user, db)
    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.customer_id == customer.id,
            Invoice.organization_id == current_user.organization_id,
        )
        .order_by(Invoice.issue_date.desc())
        .all()
    )
    return {"success": True, "data": [InvoiceOut.from_orm(i).dict() for i in invoices]}


@portal_router.get("/animals")
def portal_animals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["pallai_customer"])),
):
    """List animals the customer has active subscriptions for, with primary photo."""
    customer = _get_portal_customer(current_user, db)

    active_subs = (
        db.query(PallaiSubscription)
        .filter(
            PallaiSubscription.customer_id == customer.id,
            PallaiSubscription.organization_id == current_user.organization_id,
            PallaiSubscription.is_active == True,
        )
        .all()
    )

    seen_animal_ids = set()
    result = []
    for sub in active_subs:
        animal = sub.animal
        if not animal or animal.id in seen_animal_ids:
            continue
        seen_animal_ids.add(animal.id)

        # Get primary photo
        primary_photo = None
        if animal.photos:
            for photo in animal.photos:
                if photo.is_primary:
                    primary_photo = photo.photo_url
                    break
            if primary_photo is None and animal.photos:
                primary_photo = animal.photos[0].photo_url

        result.append({
            "id": animal.id,
            "name": animal.name,
            "animal_code": animal.animal_code,
            "species": animal.species.value if animal.species else None,
            "breed": animal.breed,
            "gender": animal.gender.value if animal.gender else None,
            "status": animal.status.value if animal.status else None,
            "primary_photo": primary_photo,
            "subscription_id": sub.id,
            "package_name": sub.package.name if sub.package else None,
            "monthly_fee": sub.monthly_fee,
            "start_date": sub.start_date,
        })

    return {"success": True, "data": result}


# ─────────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────────

@reports_router.get("/reports/summary")
def reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "farm_manager", "accountant"])
    ),
):
    """
    Summary report:
    - total_customers
    - active_subscriptions
    - monthly_revenue (sum of monthly_fee for active subscriptions)
    - outstanding_balance (sum of unpaid pallai invoices)
    """
    total_customers = (
        db.query(func.count(PallaiCustomer.id))
        .filter(
            PallaiCustomer.organization_id == current_user.organization_id,
            PallaiCustomer.is_active == True,
        )
        .scalar()
    ) or 0

    active_subscriptions = (
        db.query(func.count(PallaiSubscription.id))
        .filter(
            PallaiSubscription.organization_id == current_user.organization_id,
            PallaiSubscription.is_active == True,
        )
        .scalar()
    ) or 0

    monthly_revenue = (
        db.query(func.sum(PallaiSubscription.monthly_fee))
        .filter(
            PallaiSubscription.organization_id == current_user.organization_id,
            PallaiSubscription.is_active == True,
        )
        .scalar()
    ) or Decimal("0.00")

    # Outstanding: sum of (total - paid) for invoices linked to pallai subscriptions
    outstanding_balance = (
        db.query(func.sum(Invoice.total_amount - Invoice.paid_amount))
        .filter(
            Invoice.organization_id == current_user.organization_id,
            Invoice.subscription_id.isnot(None),
            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.DRAFT]),
        )
        .scalar()
    ) or Decimal("0.00")

    return {"success": True, "data": {
        "total_customers": total_customers,
        "active_subscriptions": active_subscriptions,
        "monthly_revenue": float(monthly_revenue),
        "outstanding_balance": float(outstanding_balance),
    }}


@reports_router.get("/reports/revenue")
def reports_revenue(
    months: int = Query(6, ge=1, le=24, description="Number of past months to include"),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["super_admin", "owner", "farm_manager", "accountant"])
    ),
):
    """
    Monthly revenue breakdown for the last N months.
    Returns list of {month, invoiced, collected}.
    """
    today = date.today()

    result = []
    for i in range(months - 1, -1, -1):
        # Calculate target year/month going backwards from today
        target_month = today.month - i
        target_year = today.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1

        month_str = f"{target_year}-{target_month:02d}"
        first_day = date(target_year, target_month, 1)
        last_day = date(target_year, target_month, calendar.monthrange(target_year, target_month)[1])

        # Invoiced: total_amount of pallai invoices issued in this month
        invoiced = (
            db.query(func.sum(Invoice.total_amount))
            .filter(
                Invoice.organization_id == current_user.organization_id,
                Invoice.subscription_id.isnot(None),
                Invoice.issue_date >= first_day,
                Invoice.issue_date <= last_day,
            )
            .scalar()
        ) or Decimal("0.00")

        # Collected: payments received against pallai invoices in this month
        collected = (
            db.query(func.sum(Payment.amount))
            .join(Invoice, Payment.invoice_id == Invoice.id)
            .filter(
                Payment.organization_id == current_user.organization_id,
                Invoice.subscription_id.isnot(None),
                Payment.payment_date >= first_day,
                Payment.payment_date <= last_day,
            )
            .scalar()
        ) or Decimal("0.00")

        result.append({
            "month": month_str,
            "invoiced": float(invoiced),
            "collected": float(collected),
        })

    return {"success": True, "data": result}


# Package CRUD is handled by business.py pkg_router.
# package_router here is kept as a placeholder for future pallai-specific package routes.


# ─────────────────────────────────────────────
# MAIN ROUTER
# ─────────────────────────────────────────────

router = APIRouter(tags=["Pallai"])

router.include_router(sub_router)
router.include_router(customer_sub_router)
router.include_router(billing_router)
router.include_router(portal_router)
router.include_router(reports_router)
