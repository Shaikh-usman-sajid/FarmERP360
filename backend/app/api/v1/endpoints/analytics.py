from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from typing import Optional
from datetime import date, timedelta
from decimal import Decimal
import calendar
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    Animal, AnimalStatus, MilkProduction, MilkSale, Treatment, Vaccination,
    BreedingRecord, Product, InventoryTransaction, InventoryTxType,
    Employee, AttendanceRecord, Invoice, Payment, InvoiceStatus,
    Investor, ProfitDistribution, PallaiCustomer, PallaiSubscription,
    VendorBill, VendorBillStatus, PayrollRun, PayrollRecord, User,
    PallaiPackage, EmploymentStatus, Customer
)

router = APIRouter(tags=["Analytics"])

def get_org(u): return u.organization_id


def _month_range(months: int):
    """Yield (year, month, month_str, first_day, last_day) for last N months."""
    today = date.today()
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        first = date(y, m, 1)
        last = date(y, m, calendar.monthrange(y, m)[1])
        yield y, m, f"{y}-{m:02d}", first, last


def _pct_change(current: float, previous: float) -> Optional[float]:
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 2)


@router.get("/analytics/overview")
def analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    today = date.today()

    cur_year, cur_month = today.year, today.month
    prev_month = cur_month - 1
    prev_year = cur_year
    if prev_month <= 0:
        prev_month += 12
        prev_year -= 1

    cur_first = date(cur_year, cur_month, 1)
    cur_last = date(cur_year, cur_month, calendar.monthrange(cur_year, cur_month)[1])
    prev_first = date(prev_year, prev_month, 1)
    prev_last = date(prev_year, prev_month, calendar.monthrange(prev_year, prev_month)[1])

    # Milk liters
    cur_milk = db.query(func.coalesce(func.sum(MilkProduction.quantity_liters), 0)).filter(
        MilkProduction.organization_id == org_id,
        MilkProduction.production_date >= cur_first,
        MilkProduction.production_date <= cur_last,
    ).scalar() or Decimal("0")

    prev_milk = db.query(func.coalesce(func.sum(MilkProduction.quantity_liters), 0)).filter(
        MilkProduction.organization_id == org_id,
        MilkProduction.production_date >= prev_first,
        MilkProduction.production_date <= prev_last,
    ).scalar() or Decimal("0")

    # Milk revenue from MilkSale
    cur_milk_rev = db.query(func.coalesce(func.sum(MilkSale.total_amount), 0)).filter(
        MilkSale.organization_id == org_id,
        MilkSale.sale_date >= cur_first,
        MilkSale.sale_date <= cur_last,
    ).scalar() or Decimal("0")

    prev_milk_rev = db.query(func.coalesce(func.sum(MilkSale.total_amount), 0)).filter(
        MilkSale.organization_id == org_id,
        MilkSale.sale_date >= prev_first,
        MilkSale.sale_date <= prev_last,
    ).scalar() or Decimal("0")

    # Total active animals
    cur_animals = db.query(func.count(Animal.id)).filter(
        Animal.organization_id == org_id,
        Animal.is_active == True,
    ).scalar() or 0

    prev_animals = cur_animals  # animal count doesn't track monthly changes simply; use same for prev

    # Treatments count
    cur_treatments = db.query(func.count(Treatment.id)).filter(
        Treatment.organization_id == org_id,
        Treatment.treatment_date >= cur_first,
        Treatment.treatment_date <= cur_last,
    ).scalar() or 0

    prev_treatments = db.query(func.count(Treatment.id)).filter(
        Treatment.organization_id == org_id,
        Treatment.treatment_date >= prev_first,
        Treatment.treatment_date <= prev_last,
    ).scalar() or 0

    # Invoices issued count
    cur_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.organization_id == org_id,
        Invoice.issue_date >= cur_first,
        Invoice.issue_date <= cur_last,
    ).scalar() or 0

    prev_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.organization_id == org_id,
        Invoice.issue_date >= prev_first,
        Invoice.issue_date <= prev_last,
    ).scalar() or 0

    # Payments received
    cur_payments = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.organization_id == org_id,
        Payment.payment_date >= cur_first,
        Payment.payment_date <= cur_last,
    ).scalar() or Decimal("0")

    prev_payments = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.organization_id == org_id,
        Payment.payment_date >= prev_first,
        Payment.payment_date <= prev_last,
    ).scalar() or Decimal("0")

    # Low stock count
    low_stock_count = db.query(func.count(Product.id)).filter(
        Product.organization_id == org_id,
        Product.is_active == True,
        Product.current_stock <= Product.min_stock_level,
    ).scalar() or 0

    # Vaccinations due in next 7 days
    vac_due_end = today + timedelta(days=7)
    vaccinations_due_7days = db.query(func.count(Vaccination.id)).filter(
        Vaccination.organization_id == org_id,
        Vaccination.next_due_date >= today,
        Vaccination.next_due_date <= vac_due_end,
    ).scalar() or 0

    def metric(value, prev_value):
        v = float(value)
        p = float(prev_value)
        return {
            "value": round(v, 2),
            "prev_value": round(p, 2),
            "change_pct": _pct_change(v, p),
        }

    return {
        "success": True,
        "data": {
            "milk_liters": metric(cur_milk, prev_milk),
            "milk_revenue": metric(cur_milk_rev, prev_milk_rev),
            "total_animals": metric(cur_animals, prev_animals),
            "treatments_count": metric(cur_treatments, prev_treatments),
            "invoices_issued_count": metric(cur_invoices, prev_invoices),
            "payments_received": metric(cur_payments, prev_payments),
            "low_stock_count": low_stock_count,
            "vaccinations_due_7days": vaccinations_due_7days,
        },
    }


@router.get("/analytics/milk-trends")
def analytics_milk_trends(
    months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    result = []

    for year, month, month_str, first_day, last_day in _month_range(months):
        days_in_month = calendar.monthrange(year, month)[1]

        liters = db.query(func.coalesce(func.sum(MilkProduction.quantity_liters), 0)).filter(
            MilkProduction.organization_id == org_id,
            MilkProduction.production_date >= first_day,
            MilkProduction.production_date <= last_day,
        ).scalar() or Decimal("0")

        revenue = db.query(func.coalesce(func.sum(MilkSale.total_amount), 0)).filter(
            MilkSale.organization_id == org_id,
            MilkSale.sale_date >= first_day,
            MilkSale.sale_date <= last_day,
        ).scalar() or Decimal("0")

        liters_f = float(liters)
        result.append({
            "month": month_str,
            "liters": round(liters_f, 2),
            "revenue": round(float(revenue), 2),
            "avg_daily": round(liters_f / days_in_month, 2),
        })

    return {"success": True, "data": result}


@router.get("/analytics/milk-sales-by-customer")
def analytics_milk_sales_by_customer(
    months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    today = date.today()
    cutoff = date(today.year - (1 if today.month <= months % 12 else 0),
                  ((today.month - months) % 12) or 12, 1)
    # Re-compute exact cutoff using _month_range
    periods = list(_month_range(months))
    date_from = periods[0][3]   # first day of oldest month
    date_to   = periods[-1][4]  # last day of newest month

    # Aggregate by customer_id (linked customer)
    linked = (
        db.query(
            MilkSale.customer_id,
            func.coalesce(func.sum(MilkSale.quantity_liters), 0).label("liters"),
            func.coalesce(func.sum(MilkSale.total_amount), 0).label("revenue"),
            func.count(MilkSale.id).label("transactions"),
        )
        .filter(
            MilkSale.organization_id == org_id,
            MilkSale.customer_id.isnot(None),
            MilkSale.sale_date >= date_from,
            MilkSale.sale_date <= date_to,
        )
        .group_by(MilkSale.customer_id)
        .all()
    )

    # Aggregate walk-ins (no customer_id) grouped by buyer_name
    walkin = (
        db.query(
            MilkSale.buyer_name,
            func.coalesce(func.sum(MilkSale.quantity_liters), 0).label("liters"),
            func.coalesce(func.sum(MilkSale.total_amount), 0).label("revenue"),
            func.count(MilkSale.id).label("transactions"),
        )
        .filter(
            MilkSale.organization_id == org_id,
            MilkSale.customer_id.is_(None),
            MilkSale.sale_date >= date_from,
            MilkSale.sale_date <= date_to,
        )
        .group_by(MilkSale.buyer_name)
        .all()
    )

    # Fetch customer names for linked rows
    cust_ids = [r.customer_id for r in linked if r.customer_id]
    cust_map = {}
    if cust_ids:
        customers = db.query(Customer).filter(Customer.id.in_(cust_ids)).all()
        cust_map = {c.id: c.name for c in customers}

    result = []
    for row in linked:
        liters = float(row.liters)
        revenue = float(row.revenue)
        result.append({
            "customer_id": row.customer_id,
            "customer_name": cust_map.get(row.customer_id, "Unknown"),
            "liters": round(liters, 2),
            "revenue": round(revenue, 2),
            "transactions": row.transactions,
            "avg_price_per_liter": round(revenue / liters, 2) if liters > 0 else 0,
        })

    for row in walkin:
        liters = float(row.liters)
        revenue = float(row.revenue)
        result.append({
            "customer_id": None,
            "customer_name": row.buyer_name or "Walk-in",
            "liters": round(liters, 2),
            "revenue": round(revenue, 2),
            "transactions": row.transactions,
            "avg_price_per_liter": round(revenue / liters, 2) if liters > 0 else 0,
        })

    result.sort(key=lambda x: x["revenue"], reverse=True)
    return {"success": True, "data": result}


@router.get("/analytics/animal-profitability")
def analytics_animal_profitability(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    today = date.today()
    twelve_months_ago = today - timedelta(days=365)

    animals = db.query(Animal).filter(
        Animal.organization_id == org_id,
        Animal.is_active == True,
    ).all()

    animal_ids = [a.id for a in animals]

    # Single aggregation query for milk liters per animal
    milk_by_animal = dict(
        db.query(MilkProduction.animal_id, func.coalesce(func.sum(MilkProduction.quantity_liters), 0))
        .filter(
            MilkProduction.animal_id.in_(animal_ids),
            MilkProduction.production_date >= twelve_months_ago,
        )
        .group_by(MilkProduction.animal_id)
        .all()
    ) if animal_ids else {}

    # Single aggregation query for treatment cost per animal
    treatment_by_animal = dict(
        db.query(Treatment.animal_id, func.coalesce(func.sum(Treatment.cost), 0))
        .filter(
            Treatment.animal_id.in_(animal_ids),
            Treatment.treatment_date >= twelve_months_ago,
        )
        .group_by(Treatment.animal_id)
        .all()
    ) if animal_ids else {}

    # Single aggregation query for vaccination count per animal
    vac_by_animal = dict(
        db.query(Vaccination.animal_id, func.count(Vaccination.id))
        .filter(
            Vaccination.animal_id.in_(animal_ids),
            Vaccination.administered_date >= twelve_months_ago,
        )
        .group_by(Vaccination.animal_id)
        .all()
    ) if animal_ids else {}

    rows = []
    for animal in animals:
        milk_liters = float(milk_by_animal.get(animal.id, 0))
        milk_revenue = milk_liters * 80.0
        treatment_cost = float(treatment_by_animal.get(animal.id, 0))
        vac_count = int(vac_by_animal.get(animal.id, 0))
        vaccination_cost = vac_count * 500.0

        estimated_profit = milk_revenue - treatment_cost - vaccination_cost

        rows.append({
            "animal_id": animal.id,
            "animal_code": animal.animal_code,
            "name": animal.name,
            "breed": animal.breed,
            "species": animal.species,
            "milk_revenue": round(milk_revenue, 2),
            "treatment_cost": round(treatment_cost, 2),
            "vaccination_cost": round(vaccination_cost, 2),
            "estimated_profit": round(estimated_profit, 2),
        })

    rows.sort(key=lambda x: x["estimated_profit"], reverse=True)
    return {"success": True, "data": rows[:20]}


@router.get("/analytics/cash-flow")
def analytics_cash_flow(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    result = []

    for year, month, month_str, first_day, last_day in _month_range(months):
        # Income: MilkSale revenue + Payments received
        milk_income = db.query(func.coalesce(func.sum(MilkSale.total_amount), 0)).filter(
            MilkSale.organization_id == org_id,
            MilkSale.sale_date >= first_day,
            MilkSale.sale_date <= last_day,
        ).scalar() or Decimal("0")

        payment_income = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.organization_id == org_id,
            Payment.payment_date >= first_day,
            Payment.payment_date <= last_day,
        ).scalar() or Decimal("0")

        income = float(milk_income) + float(payment_income)

        # Expenses: Treatment costs + Vendor bills paid
        treatment_expense = db.query(func.coalesce(func.sum(Treatment.cost), 0)).filter(
            Treatment.organization_id == org_id,
            Treatment.treatment_date >= first_day,
            Treatment.treatment_date <= last_day,
        ).scalar() or Decimal("0")

        vendor_expense = db.query(func.coalesce(func.sum(VendorBill.paid_amount), 0)).filter(
            VendorBill.organization_id == org_id,
            VendorBill.status == VendorBillStatus.PAID,
            VendorBill.bill_date >= first_day,
            VendorBill.bill_date <= last_day,
        ).scalar() or Decimal("0")

        # Payroll expenses: sum total_net from PayrollRun for this month/year
        payroll_expense = db.query(func.coalesce(func.sum(PayrollRun.total_net), 0)).filter(
            PayrollRun.organization_id == org_id,
            PayrollRun.year == year,
            PayrollRun.month == month,
        ).scalar() or Decimal("0")

        expenses = float(treatment_expense) + float(vendor_expense) + float(payroll_expense)

        result.append({
            "month": month_str,
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "net": round(income - expenses, 2),
        })

    return {"success": True, "data": result}


@router.get("/analytics/farm-health")
def analytics_farm_health(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    today = date.today()
    monthly = []
    total_treatments_all = 0

    for year, month, month_str, first_day, last_day in _month_range(months):
        vaccinations = db.query(func.count(Vaccination.id)).filter(
            Vaccination.organization_id == org_id,
            Vaccination.administered_date >= first_day,
            Vaccination.administered_date <= last_day,
        ).scalar() or 0

        treatments = db.query(func.count(Treatment.id)).filter(
            Treatment.organization_id == org_id,
            Treatment.treatment_date >= first_day,
            Treatment.treatment_date <= last_day,
        ).scalar() or 0

        breeding_attempts = db.query(func.count(BreedingRecord.id)).filter(
            BreedingRecord.organization_id == org_id,
            BreedingRecord.breeding_date >= first_day,
            BreedingRecord.breeding_date <= last_day,
        ).scalar() or 0

        total_treatments_all += treatments
        monthly.append({
            "month": month_str,
            "vaccinations": vaccinations,
            "treatments": treatments,
            "breeding_attempts": breeding_attempts,
        })

    # Overall stats
    year_start = date(today.year, 1, 1)
    animals_vaccinated_this_year = db.query(func.count(func.distinct(Vaccination.animal_id))).filter(
        Vaccination.organization_id == org_id,
        Vaccination.administered_date >= year_start,
        Vaccination.administered_date <= today,
    ).scalar() or 0

    total_active_animals = db.query(func.count(Animal.id)).filter(
        Animal.organization_id == org_id,
        Animal.is_active == True,
    ).scalar() or 0

    vaccination_compliance_pct = (
        round(animals_vaccinated_this_year / total_active_animals * 100, 2)
        if total_active_animals > 0 else 0.0
    )

    avg_monthly_treatments = round(total_treatments_all / months, 2) if months > 0 else 0.0

    return {
        "success": True,
        "data": {
            "monthly": monthly,
            "overall_stats": {
                "vaccination_compliance_pct": vaccination_compliance_pct,
                "avg_monthly_treatments": avg_monthly_treatments,
            },
        },
    }


@router.get("/analytics/inventory-health")
def analytics_inventory_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    # Low stock products
    low_stock_products = db.query(Product).filter(
        Product.organization_id == org_id,
        Product.is_active == True,
        Product.current_stock <= Product.min_stock_level,
    ).all()

    low_stock_items = [
        {
            "product_name": p.name,
            "current_stock": float(p.current_stock or 0),
            "min_stock_level": float(p.min_stock_level or 0),
            "deficit": round(float(p.min_stock_level or 0) - float(p.current_stock or 0), 2),
        }
        for p in low_stock_products
    ]

    # Top consumed products (OUT transactions in last 30 days)
    top_consumed_rows = (
        db.query(
            Product.name,
            func.sum(InventoryTransaction.quantity).label("quantity_used"),
        )
        .join(InventoryTransaction, InventoryTransaction.product_id == Product.id)
        .filter(
            InventoryTransaction.organization_id == org_id,
            InventoryTransaction.transaction_type == InventoryTxType.OUT,
            InventoryTransaction.transaction_date >= thirty_days_ago,
            InventoryTransaction.transaction_date <= today,
        )
        .group_by(Product.id, Product.name)
        .order_by(func.sum(InventoryTransaction.quantity).desc())
        .limit(10)
        .all()
    )

    top_consumed = [
        {"product_name": row.name, "quantity_used": round(float(row.quantity_used), 2)}
        for row in top_consumed_rows
    ]

    return {
        "success": True,
        "data": {
            "low_stock_count": len(low_stock_items),
            "low_stock_items": low_stock_items,
            "top_consumed": top_consumed,
        },
    }


@router.get("/analytics/investor-performance")
def analytics_investor_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)

    investors = db.query(Investor).filter(
        Investor.organization_id == org_id,
        Investor.is_active == True,
    ).all()

    investor_rows = []
    total_capital_all = 0.0
    total_distributed_all = 0.0

    for inv in investors:
        total_capital = float(inv.total_capital or 0)
        total_distributed = db.query(func.coalesce(func.sum(ProfitDistribution.amount), 0)).filter(
            ProfitDistribution.investor_id == inv.id,
            ProfitDistribution.organization_id == org_id,
        ).scalar() or Decimal("0")
        total_distributed = float(total_distributed)

        roi_pct = round(total_distributed / total_capital * 100, 2) if total_capital > 0 else 0.0

        investor_rows.append({
            "investor_id": inv.id,
            "name": inv.full_name,
            "total_capital": round(total_capital, 2),
            "total_distributed": round(total_distributed, 2),
            "roi_pct": roi_pct,
        })

        total_capital_all += total_capital
        total_distributed_all += total_distributed

    # Monthly distributions for last 6 months
    monthly_distributions = []
    for year, month, month_str, first_day, last_day in _month_range(6):
        dist_total = db.query(func.coalesce(func.sum(ProfitDistribution.amount), 0)).filter(
            ProfitDistribution.organization_id == org_id,
            ProfitDistribution.distribution_date >= first_day,
            ProfitDistribution.distribution_date <= last_day,
        ).scalar() or Decimal("0")

        monthly_distributions.append({
            "month": month_str,
            "total_distributed": round(float(dist_total), 2),
        })

    return {
        "success": True,
        "data": {
            "investors": investor_rows,
            "monthly_distributions": monthly_distributions,
            "total_capital": round(total_capital_all, 2),
            "total_distributed": round(total_distributed_all, 2),
        },
    }


@router.get("/analytics/pallai-performance")
def analytics_pallai_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)

    # Active subscriptions
    active_subscriptions = db.query(func.count(PallaiSubscription.id)).filter(
        PallaiSubscription.organization_id == org_id,
        PallaiSubscription.is_active == True,
    ).scalar() or 0

    # Monthly revenue target: sum of monthly_fee for active subscriptions
    monthly_revenue_target = db.query(
        func.coalesce(func.sum(PallaiSubscription.monthly_fee), 0)
    ).filter(
        PallaiSubscription.organization_id == org_id,
        PallaiSubscription.is_active == True,
    ).scalar() or Decimal("0")
    monthly_revenue_target = float(monthly_revenue_target)

    # Collection rate: paid pallai invoices vs total pallai invoices
    total_pallai_invoiced = db.query(
        func.coalesce(func.sum(Invoice.total_amount), 0)
    ).filter(
        Invoice.organization_id == org_id,
        Invoice.subscription_id != None,
    ).scalar() or Decimal("0")

    total_pallai_collected = db.query(
        func.coalesce(func.sum(Invoice.paid_amount), 0)
    ).filter(
        Invoice.organization_id == org_id,
        Invoice.subscription_id != None,
    ).scalar() or Decimal("0")

    collection_rate = (
        round(float(total_pallai_collected) / float(total_pallai_invoiced) * 100, 2)
        if float(total_pallai_invoiced) > 0 else 0.0
    )

    # Subscriptions by package
    package_rows = (
        db.query(
            PallaiPackage.name,
            func.count(PallaiSubscription.id).label("count"),
            func.coalesce(func.sum(PallaiSubscription.monthly_fee), 0).label("monthly_revenue"),
        )
        .join(PallaiSubscription, PallaiSubscription.package_id == PallaiPackage.id)
        .filter(
            PallaiSubscription.organization_id == org_id,
            PallaiSubscription.is_active == True,
        )
        .group_by(PallaiPackage.id, PallaiPackage.name)
        .all()
    )

    subscriptions_by_package = [
        {
            "package_name": row.name,
            "count": row.count,
            "monthly_revenue": round(float(row.monthly_revenue), 2),
        }
        for row in package_rows
    ]

    # Monthly billing for last 6 months
    monthly_billing = []
    for year, month, month_str, first_day, last_day in _month_range(6):
        invoiced = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
            Invoice.organization_id == org_id,
            Invoice.subscription_id != None,
            Invoice.issue_date >= first_day,
            Invoice.issue_date <= last_day,
        ).scalar() or Decimal("0")

        collected = db.query(func.coalesce(func.sum(Invoice.paid_amount), 0)).filter(
            Invoice.organization_id == org_id,
            Invoice.subscription_id != None,
            Invoice.issue_date >= first_day,
            Invoice.issue_date <= last_day,
        ).scalar() or Decimal("0")

        monthly_billing.append({
            "month": month_str,
            "invoiced": round(float(invoiced), 2),
            "collected": round(float(collected), 2),
        })

    return {
        "success": True,
        "data": {
            "active_subscriptions": active_subscriptions,
            "monthly_revenue_target": round(monthly_revenue_target, 2),
            "collection_rate": collection_rate,
            "subscriptions_by_package": subscriptions_by_package,
            "monthly_billing": monthly_billing,
        },
    }


@router.get("/analytics/customers")
def analytics_customers(
    months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    today = date.today()
    month_start = today.replace(day=1)
    thirty_days_ago = today - timedelta(days=30)
    sixty_days_ago = today - timedelta(days=60)

    # Totals
    total_active = db.query(func.count(Customer.id)).filter(
        Customer.organization_id == org_id, Customer.is_active == True
    ).scalar() or 0

    total_inactive = db.query(func.count(Customer.id)).filter(
        Customer.organization_id == org_id, Customer.is_active == False
    ).scalar() or 0

    new_this_month = db.query(func.count(Customer.id)).filter(
        Customer.organization_id == org_id,
        Customer.is_active == True,
        Customer.created_at >= month_start,
    ).scalar() or 0

    # Customers with a milk sale in last 30 days
    active_buyers = db.query(MilkSale.customer_id).filter(
        MilkSale.organization_id == org_id,
        MilkSale.customer_id.isnot(None),
        MilkSale.sale_date >= thirty_days_ago,
    ).distinct().subquery()

    at_risk = db.query(func.count(Customer.id)).filter(
        Customer.organization_id == org_id,
        Customer.is_active == True,
        Customer.id.notin_(db.query(active_buyers.c.customer_id)),
        Customer.id.in_(
            db.query(MilkSale.customer_id).filter(
                MilkSale.organization_id == org_id,
                MilkSale.customer_id.isnot(None),
                MilkSale.sale_date < thirty_days_ago,
                MilkSale.sale_date >= sixty_days_ago,
            ).distinct()
        ),
    ).scalar() or 0

    # Revenue by category
    from sqlalchemy.orm import joinedload
    from app.models.models import CustomerCategory
    cats = db.query(CustomerCategory).filter(
        CustomerCategory.organization_id == org_id, CustomerCategory.is_active == True
    ).all()

    by_category = []
    for cat in cats:
        cust_ids = [c.id for c in db.query(Customer.id).filter(
            Customer.organization_id == org_id, Customer.category_id == cat.id
        ).all()]
        rev = float(db.query(func.coalesce(func.sum(MilkSale.total_amount), 0)).filter(
            MilkSale.organization_id == org_id,
            MilkSale.customer_id.in_(cust_ids),
        ).scalar() or 0)
        inv_rev = float(db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
            Invoice.organization_id == org_id,
            Invoice.customer_id.in_(cust_ids),
        ).scalar() or 0)
        by_category.append({
            "category": cat.name.strip(),
            "customer_count": len(cust_ids),
            "milk_revenue": round(rev, 2),
            "invoice_revenue": round(inv_rev, 2),
            "total_revenue": round(rev + inv_rev, 2),
        })
    by_category.sort(key=lambda x: x["total_revenue"], reverse=True)

    # Monthly new customers (acquisition trend)
    acquisition = []
    for year, month, month_str, first_day, last_day in _month_range(months):
        count = db.query(func.count(Customer.id)).filter(
            Customer.organization_id == org_id,
            Customer.created_at >= first_day,
            Customer.created_at <= last_day,
        ).scalar() or 0
        acquisition.append({"month": month_str, "new_customers": count})

    # Customer leaderboard (lifetime milk + invoice revenue)
    customers = db.query(Customer).filter(
        Customer.organization_id == org_id, Customer.is_active == True
    ).all()

    leaderboard = []
    for c in customers:
        milk_rev = float(db.query(func.coalesce(func.sum(MilkSale.total_amount), 0)).filter(
            MilkSale.organization_id == org_id, MilkSale.customer_id == c.id
        ).scalar() or 0)
        inv_rev = float(db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
            Invoice.organization_id == org_id, Invoice.customer_id == c.id
        ).scalar() or 0)
        txns = db.query(func.count(MilkSale.id)).filter(
            MilkSale.organization_id == org_id, MilkSale.customer_id == c.id
        ).scalar() or 0
        last_sale = db.query(func.max(MilkSale.sale_date)).filter(
            MilkSale.organization_id == org_id, MilkSale.customer_id == c.id
        ).scalar()
        days_since = (today - last_sale).days if last_sale else None
        status = "active" if (days_since is not None and days_since <= 30) else ("at_risk" if (days_since is not None and days_since <= 60) else ("churned" if days_since is not None else "new"))
        leaderboard.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "city": c.city,
            "category_id": c.category_id,
            "milk_revenue": round(milk_rev, 2),
            "invoice_revenue": round(inv_rev, 2),
            "total_revenue": round(milk_rev + inv_rev, 2),
            "transactions": txns,
            "last_sale_date": str(last_sale) if last_sale else None,
            "days_since_last_sale": days_since,
            "status": status,
        })
    leaderboard.sort(key=lambda x: x["total_revenue"], reverse=True)

    return {
        "success": True,
        "data": {
            "total_active": total_active,
            "total_inactive": total_inactive,
            "new_this_month": new_this_month,
            "at_risk": at_risk,
            "by_category": by_category,
            "acquisition_trend": acquisition,
            "leaderboard": leaderboard,
        },
    }
