from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta, datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    Animal, MilkProduction, MilkSale, Product, Employee,
    Investor, Invoice, Payment, Notification, AuditLog,
    User, UserRole, AnimalStatus, InvoiceStatus, AttendanceRecord,
    Vaccination, Treatment, Customer, CustomerCategory
)

router = APIRouter(tags=["Dashboard & Reports"])


def get_org(u): return u.organization_id


@router.get("/dashboard/owner")
def owner_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org_id = get_org(current_user)
    today = date.today()
    month_start = today.replace(day=1)

    total_animals = db.query(func.count(Animal.id)).filter(Animal.organization_id == org_id, Animal.is_active == True).scalar()
    active_animals = db.query(func.count(Animal.id)).filter(Animal.organization_id == org_id, Animal.status == AnimalStatus.ACTIVE, Animal.is_active == True).scalar()

    milk_today = db.query(func.sum(MilkProduction.quantity_liters)).filter(
        MilkProduction.organization_id == org_id,
        MilkProduction.production_date == today
    ).scalar() or 0

    milk_month = db.query(func.sum(MilkProduction.quantity_liters)).filter(
        MilkProduction.organization_id == org_id,
        MilkProduction.production_date >= month_start
    ).scalar() or 0

    revenue_month = db.query(func.sum(MilkSale.total_amount)).filter(
        MilkSale.organization_id == org_id,
        MilkSale.sale_date >= month_start
    ).scalar() or 0

    total_investors = db.query(func.count(Investor.id)).filter(Investor.organization_id == org_id, Investor.is_active == True).scalar()
    total_capital = db.query(func.sum(Investor.total_capital)).filter(Investor.organization_id == org_id).scalar() or 0

    pending_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.organization_id == org_id,
        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE])
    ).scalar()

    low_stock = db.query(func.count(Product.id)).filter(
        Product.organization_id == org_id,
        Product.is_active == True,
        Product.current_stock <= Product.min_stock_level
    ).scalar()

    vaccinations_due = db.query(func.count(Vaccination.id)).filter(
        Vaccination.organization_id == org_id,
        Vaccination.next_due_date <= today + timedelta(days=7),
        Vaccination.next_due_date >= today
    ).scalar()

    # Milk trend (last 7 days)
    milk_trend = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        qty = db.query(func.sum(MilkProduction.quantity_liters)).filter(
            MilkProduction.organization_id == org_id,
            MilkProduction.production_date == d
        ).scalar() or 0
        milk_trend.append({"date": str(d), "liters": float(qty)})

    # Customer stats
    total_customers = db.query(func.count(Customer.id)).filter(
        Customer.organization_id == org_id, Customer.is_active == True
    ).scalar() or 0

    new_customers_month = db.query(func.count(Customer.id)).filter(
        Customer.organization_id == org_id,
        Customer.is_active == True,
        Customer.created_at >= datetime(month_start.year, month_start.month, 1)
    ).scalar() or 0

    outstanding_receivables = db.query(
        func.coalesce(func.sum(Invoice.total_amount - Invoice.paid_amount), 0)
    ).filter(
        Invoice.organization_id == org_id,
        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE])
    ).scalar() or 0

    # Top 5 customers by milk sale revenue this month
    top_customers_rows = db.query(
        MilkSale.customer_id,
        func.coalesce(func.sum(MilkSale.total_amount), 0).label("revenue"),
        func.coalesce(func.sum(MilkSale.quantity_liters), 0).label("liters"),
    ).filter(
        MilkSale.organization_id == org_id,
        MilkSale.customer_id.isnot(None),
        MilkSale.sale_date >= month_start,
    ).group_by(MilkSale.customer_id).order_by(func.sum(MilkSale.total_amount).desc()).limit(5).all()

    cust_ids = [r.customer_id for r in top_customers_rows]
    cust_map = {}
    if cust_ids:
        custs = db.query(Customer).filter(Customer.id.in_(cust_ids)).all()
        cust_map = {c.id: c.name for c in custs}

    top_customers = [
        {"name": cust_map.get(r.customer_id, "Unknown"), "revenue": float(r.revenue), "liters": float(r.liters)}
        for r in top_customers_rows
    ]

    return {
        "success": True,
        "data": {
            "total_animals": total_animals,
            "active_animals": active_animals,
            "milk_today_liters": float(milk_today),
            "milk_this_month_liters": float(milk_month),
            "revenue_this_month": float(revenue_month),
            "total_investors": total_investors,
            "total_investor_capital": float(total_capital),
            "pending_invoices": pending_invoices,
            "low_stock_items": low_stock,
            "vaccinations_due_soon": vaccinations_due,
            "milk_trend_7days": milk_trend,
            "total_customers": total_customers,
            "new_customers_this_month": new_customers_month,
            "outstanding_receivables": float(outstanding_receivables),
            "top_customers_this_month": top_customers,
        }
    }


@router.get("/dashboard/farm")
def farm_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org_id = get_org(current_user)
    today = date.today()

    by_species = db.query(Animal.species, func.count(Animal.id)).filter(
        Animal.organization_id == org_id, Animal.is_active == True
    ).group_by(Animal.species).all()

    total_employees = db.query(func.count(Employee.id)).filter(Employee.organization_id == org_id).scalar()

    present_today = db.query(func.count(AttendanceRecord.id)).filter(
        AttendanceRecord.organization_id == org_id,
        AttendanceRecord.date == today,
        AttendanceRecord.status == "present"
    ).scalar()

    milk_today = db.query(func.sum(MilkProduction.quantity_liters)).filter(
        MilkProduction.organization_id == org_id,
        MilkProduction.production_date == today
    ).scalar() or 0

    return {
        "success": True,
        "data": {
            "animals_by_species": [{"species": s.value, "count": c} for s, c in by_species],
            "total_employees": total_employees,
            "employees_present_today": present_today,
            "milk_today_liters": float(milk_today)
        }
    }


@router.get("/dashboard/accounting")
def accounting_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org_id = get_org(current_user)
    month_start = date.today().replace(day=1)

    total_revenue = db.query(func.sum(MilkSale.total_amount)).filter(
        MilkSale.organization_id == org_id,
        MilkSale.sale_date >= month_start
    ).scalar() or 0

    total_invoiced = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.organization_id == org_id,
        Invoice.issue_date >= month_start
    ).scalar() or 0

    total_paid = db.query(func.sum(Invoice.paid_amount)).filter(
        Invoice.organization_id == org_id
    ).scalar() or 0

    outstanding = db.query(func.sum(Invoice.total_amount - Invoice.paid_amount)).filter(
        Invoice.organization_id == org_id,
        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE])
    ).scalar() or 0

    return {
        "success": True,
        "data": {
            "revenue_this_month": float(total_revenue),
            "total_invoiced_this_month": float(total_invoiced),
            "total_collected": float(total_paid),
            "outstanding_receivables": float(outstanding)
        }
    }


@router.get("/dashboard/investor")
def investor_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org_id = get_org(current_user)
    investors = db.query(Investor).filter(Investor.organization_id == org_id, Investor.is_active == True).all()
    total_capital = sum(float(i.total_capital or 0) for i in investors)
    return {
        "success": True,
        "data": {
            "total_investors": len(investors),
            "total_capital_invested": total_capital,
            "investors": [{"id": i.id, "name": i.full_name, "share": float(i.profit_share_percentage or 0), "capital": float(i.total_capital or 0)} for i in investors]
        }
    }


@router.get("/notifications")
def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc())
    total = query.count()
    items = query.offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "unread": sum(1 for n in items if not n.is_read), "items": [
        {"id": n.id, "title": n.title, "message": n.message, "type": n.type, "is_read": n.is_read, "created_at": str(n.created_at)} for n in items
    ]}}


@router.put("/notifications/{notif_id}/read")
def mark_read(notif_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"success": True}


@router.get("/reports/animals")
def animal_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org_id = get_org(current_user)
    by_species = db.query(Animal.species, func.count(Animal.id)).filter(Animal.organization_id == org_id, Animal.is_active == True).group_by(Animal.species).all()
    by_status = db.query(Animal.status, func.count(Animal.id)).filter(Animal.organization_id == org_id, Animal.is_active == True).group_by(Animal.status).all()
    by_ownership = db.query(Animal.ownership_type, func.count(Animal.id)).filter(Animal.organization_id == org_id, Animal.is_active == True).group_by(Animal.ownership_type).all()
    return {
        "success": True,
        "data": {
            "by_species": [{"species": s.value, "count": c} for s, c in by_species],
            "by_status": [{"status": s.value, "count": c} for s, c in by_status],
            "by_ownership": [{"type": o.value, "count": c} for o, c in by_ownership]
        }
    }


@router.get("/reports/milk")
def milk_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = get_org(current_user)
    query = db.query(
        MilkProduction.production_date,
        func.sum(MilkProduction.quantity_liters).label("liters")
    ).filter(MilkProduction.organization_id == org_id)
    if date_from:
        query = query.filter(MilkProduction.production_date >= date_from)
    if date_to:
        query = query.filter(MilkProduction.production_date <= date_to)
    results = query.group_by(MilkProduction.production_date).order_by(MilkProduction.production_date).all()
    total = sum(float(r.liters) for r in results)
    return {"success": True, "data": {"total_liters": total, "daily": [{"date": str(r.production_date), "liters": float(r.liters)} for r in results]}}


@router.get("/audit-logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
    query = db.query(AuditLog).filter(AuditLog.organization_id == get_org(current_user))
    total = query.count()
    items = query.order_by(AuditLog.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [
        {"id": a.id, "action": a.action, "module": a.module, "user_id": str(a.user_id), "created_at": str(a.created_at)} for a in items
    ]}}
