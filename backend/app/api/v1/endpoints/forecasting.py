from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta
from decimal import Decimal
import calendar

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import (
    User, Animal, AnimalStatus, AnimalSpecies,
    MilkProduction, Invoice, InvoiceStatus, Payment,
    Employee, EmploymentStatus,
    FeedType, FeedConsumption, FeedStockTransaction, FeedTxType,
    CropCycle, CropStatus, Field,
    PallaiSubscription, PallaiCustomer,
)

router = APIRouter(prefix="/forecasting", tags=["Forecasting"])

MGMT_ROLES = ["super_admin", "owner", "farm_manager", "accountant"]

def _org(u: User) -> str:
    return u.organization_id

# kg of total feed per animal per day (rule-based fallback)
_DAILY_KG = {AnimalSpecies.BUFFALO: 15.0, AnimalSpecies.GOAT: 2.5,
             AnimalSpecies.CATTLE: 12.0, AnimalSpecies.OTHER: 3.0}

def _future_months(n: int):
    """Yield (year, month, label, days_in_month) for next n months from today."""
    today = date.today()
    y, m = today.year, today.month
    for _ in range(n):
        m += 1
        if m > 12:
            m = 1
            y += 1
        yield y, m, f"{calendar.month_abbr[m]} {y}", calendar.monthrange(y, m)[1]

def _past_months(n: int):
    """Yield (year, month, first_day, last_day) for last n complete months."""
    today = date.today()
    y, m = today.year, today.month
    results = []
    for _ in range(n):
        m -= 1
        if m == 0:
            m = 12
            y -= 1
        first = date(y, m, 1)
        last = date(y, m, calendar.monthrange(y, m)[1])
        results.append((y, m, first, last))
    return list(reversed(results))


# ══════════════════════════════════════════════════════════════════════════════
# FEED FORECASTING
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/feed")
def feed_forecast(
    months: int = Query(3, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MGMT_ROLES)),
):
    org_id = _org(current_user)
    today = date.today()
    thirty_ago = today - timedelta(days=30)

    feed_types = db.query(FeedType).filter(
        FeedType.organization_id == org_id, FeedType.is_active == True
    ).all()

    # ── Determine avg daily consumption per feed type ──────────────────────
    # Try historical data first (last 30 days)
    hist_rows = (
        db.query(FeedConsumption.feed_type_id,
                 func.sum(FeedConsumption.quantity).label("qty"))
        .filter(FeedConsumption.organization_id == org_id,
                FeedConsumption.consumption_date >= thirty_ago)
        .group_by(FeedConsumption.feed_type_id)
        .all()
    )
    hist_map = {str(r.feed_type_id): float(r.qty) / 30.0 for r in hist_rows}
    has_hist = bool(hist_map)

    # Rule-based fallback: total daily need distributed across feed types
    active_animals = db.query(Animal).filter(
        Animal.organization_id == org_id,
        Animal.status == AnimalStatus.ACTIVE,
        Animal.is_active == True,
    ).all()
    species_count: dict[str, int] = {}
    for a in active_animals:
        species_count[a.species] = species_count.get(a.species, 0) + 1

    total_daily_kg = sum(
        _DAILY_KG.get(sp, 3.0) * cnt for sp, cnt in species_count.items()
    )
    # Distribute rule-based across feed types by their stock proportion
    total_stock = sum(float(ft.current_stock or 0) for ft in feed_types) or 1.0

    future = list(_future_months(months))
    feed_forecasts = []

    for ft in feed_types:
        ft_id = str(ft.id)
        if has_hist and ft_id in hist_map:
            avg_daily = hist_map[ft_id]
            method = "historical"
        else:
            # Distribute rule-based proportionally to current stock
            weight = float(ft.current_stock or 1.0) / total_stock
            avg_daily = total_daily_kg * weight if total_daily_kg > 0 else 0.5
            method = "estimated"

        current_stock = float(ft.current_stock or 0)
        depletion_days = int(current_stock / avg_daily) if avg_daily > 0 else 9999
        depletion_date = (today + timedelta(days=depletion_days)).isoformat() if depletion_days < 9999 else None

        monthly_projection = []
        running_stock = current_stock
        for y, m, label, days in future:
            projected_consumption = round(avg_daily * days, 2)
            running_stock -= projected_consumption
            est_cost = round(projected_consumption * float(ft.cost_per_unit or 0), 2)
            monthly_projection.append({
                "month": label,
                "projected_consumption": projected_consumption,
                "estimated_cost_pkr": est_cost,
                "stock_end_of_month": round(max(running_stock, 0), 2),
            })

        total_projected = sum(m["projected_consumption"] for m in monthly_projection)
        reorder_point_days = 30
        reorder_alert = depletion_days < reorder_point_days
        suggested_order = round(avg_daily * 90 * 1.15, 2)  # 90-day supply + 15% buffer

        feed_forecasts.append({
            "feed_type_id": ft_id,
            "name": ft.name,
            "unit": ft.unit or "kg",
            "current_stock": current_stock,
            "min_stock_level": float(ft.min_stock_level or 0),
            "cost_per_unit": float(ft.cost_per_unit or 0),
            "avg_daily_consumption": round(avg_daily, 3),
            "method": method,
            "depletion_days": depletion_days if depletion_days < 9999 else None,
            "depletion_date": depletion_date,
            "reorder_alert": reorder_alert,
            "suggested_order_qty": suggested_order,
            "total_projected_consumption": round(total_projected, 2),
            "monthly_projection": monthly_projection,
        })

    # Sort: reorder alerts first, then by depletion days
    feed_forecasts.sort(key=lambda x: (not x["reorder_alert"], x["depletion_days"] or 9999))

    # Overall monthly cost summary
    monthly_cost_summary = []
    for i, (y, m, label, days) in enumerate(future):
        total_cost = sum(
            f["monthly_projection"][i]["estimated_cost_pkr"] for f in feed_forecasts
        )
        monthly_cost_summary.append({"month": label, "total_cost_pkr": round(total_cost, 2)})

    return {
        "forecast_months": months,
        "method": "historical" if has_hist else "rule_based_estimated",
        "active_animals": len(active_animals),
        "species_breakdown": {str(k): v for k, v in species_count.items()},
        "total_estimated_daily_kg": round(total_daily_kg, 2),
        "alerts_count": sum(1 for f in feed_forecasts if f["reorder_alert"]),
        "feed_forecasts": feed_forecasts,
        "monthly_cost_summary": monthly_cost_summary,
    }


# ══════════════════════════════════════════════════════════════════════════════
# CASH FLOW FORECASTING
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/cash-flow")
def cash_flow_forecast(
    months: int = Query(6, ge=1, le=24),
    milk_price_per_liter: float = Query(120.0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MGMT_ROLES)),
):
    org_id = _org(current_user)
    today = date.today()

    # ── REVENUE: Milk production trend (last 6 months) ────────────────────
    past_6 = _past_months(6)
    milk_monthly = []
    for y, m, first, last in past_6:
        liters = db.query(func.coalesce(func.sum(MilkProduction.quantity_liters), 0)).filter(
            MilkProduction.organization_id == org_id,
            MilkProduction.production_date >= first,
            MilkProduction.production_date <= last,
        ).scalar() or 0
        milk_monthly.append(float(liters))

    # Linear trend: fit last 6 months, project forward
    n = len(milk_monthly)
    if n >= 2:
        x_mean = (n - 1) / 2.0
        y_mean = sum(milk_monthly) / n
        num = sum((i - x_mean) * (milk_monthly[i] - y_mean) for i in range(n))
        den = sum((i - x_mean) ** 2 for i in range(n)) or 1
        slope = num / den
        last_val = milk_monthly[-1]
    else:
        slope = 0
        last_val = sum(milk_monthly) / max(n, 1)

    # ── REVENUE: Subscription (Pallai) — last 3 months average ───────────
    sub_monthly = []
    for y, m, first, last in _past_months(3):
        paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.organization_id == org_id,
            Payment.payment_date >= first,
            Payment.payment_date <= last,
        ).scalar() or 0
        sub_monthly.append(float(paid))
    avg_sub_revenue = sum(sub_monthly) / max(len(sub_monthly), 1)

    # ── EXPENSES: Salaries ────────────────────────────────────────────────
    monthly_salary_total = float(
        db.query(func.coalesce(func.sum(Employee.monthly_salary), 0)).filter(
            Employee.organization_id == org_id,
            Employee.status == EmploymentStatus.ACTIVE,
        ).scalar() or 0
    )

    # ── EXPENSES: Feed cost trend (last 3 months of stock IN transactions) ─
    feed_monthly = []
    for y, m, first, last in _past_months(3):
        cost = db.query(func.coalesce(func.sum(FeedStockTransaction.total_cost), 0)).filter(
            FeedStockTransaction.organization_id == org_id,
            FeedStockTransaction.total_cost != None,
            FeedStockTransaction.transaction_date >= first,
            FeedStockTransaction.transaction_date <= last,
        ).scalar() or 0
        feed_monthly.append(float(cost))
    avg_feed_cost = sum(feed_monthly) / max(len(feed_monthly), 1)

    # ── EXPENSES: Vet / treatment costs (last 3 months from invoices) ─────
    # Use a flat estimate if no data: 5% of salary cost
    avg_vet_cost = monthly_salary_total * 0.05

    # ── BUILD PROJECTIONS ─────────────────────────────────────────────────
    future = list(_future_months(months))
    projections = []
    opening_balance = 0.0  # relative; actual cash balance unknown without full accounting

    for i, (y, m, label, days) in enumerate(future):
        # Milk projection: last value + i+1 steps of slope, floored at 0
        proj_liters = max(0.0, last_val + (i + 1) * slope)
        milk_rev = round(proj_liters * milk_price_per_liter, 2)
        sub_rev = round(avg_sub_revenue, 2)
        total_rev = milk_rev + sub_rev

        total_exp = round(monthly_salary_total + avg_feed_cost + avg_vet_cost, 2)
        net = round(total_rev - total_exp, 2)
        opening_balance += net

        projections.append({
            "month": label,
            "projected_milk_liters": round(proj_liters, 1),
            "milk_revenue": milk_rev,
            "subscription_revenue": sub_rev,
            "total_revenue": total_rev,
            "salary_expense": round(monthly_salary_total, 2),
            "feed_expense": round(avg_feed_cost, 2),
            "vet_expense": round(avg_vet_cost, 2),
            "total_expense": total_exp,
            "net_cash_flow": net,
            "cumulative_net": round(opening_balance, 2),
        })

    # Historical actual for chart overlay (last 6 months)
    historical = []
    for y, m, first, last in past_6:
        liters = db.query(func.coalesce(func.sum(MilkProduction.quantity_liters), 0)).filter(
            MilkProduction.organization_id == org_id,
            MilkProduction.production_date >= first,
            MilkProduction.production_date <= last,
        ).scalar() or 0
        paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.organization_id == org_id,
            Payment.payment_date >= first,
            Payment.payment_date <= last,
        ).scalar() or 0
        label = f"{calendar.month_abbr[m]} {y}"
        historical.append({
            "month": label,
            "actual_milk_liters": round(float(liters), 1),
            "actual_revenue": round(float(liters) * milk_price_per_liter + float(paid), 2),
        })

    return {
        "forecast_months": months,
        "milk_price_per_liter": milk_price_per_liter,
        "assumptions": {
            "avg_monthly_milk_liters": round(sum(milk_monthly) / max(len(milk_monthly), 1), 1),
            "milk_trend_slope_liters_per_month": round(slope, 2),
            "avg_subscription_revenue": round(avg_sub_revenue, 2),
            "monthly_salary_total": round(monthly_salary_total, 2),
            "avg_feed_cost": round(avg_feed_cost, 2),
        },
        "historical": historical,
        "projections": projections,
        "summary": {
            "total_projected_revenue": round(sum(p["total_revenue"] for p in projections), 2),
            "total_projected_expense": round(sum(p["total_expense"] for p in projections), 2),
            "total_projected_net": round(sum(p["net_cash_flow"] for p in projections), 2),
            "positive_months": sum(1 for p in projections if p["net_cash_flow"] >= 0),
            "negative_months": sum(1 for p in projections if p["net_cash_flow"] < 0),
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# CROP YIELD FORECASTING
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/crop-yield")
def crop_yield_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MGMT_ROLES)),
):
    org_id = _org(current_user)
    today = date.today()

    cycles = db.query(CropCycle).filter(CropCycle.organization_id == org_id).all()

    # Build a field name lookup
    field_ids = list({c.field_id for c in cycles if c.field_id})
    field_map: dict[str, str] = {}
    if field_ids:
        from app.models.models import Field as FieldModel
        fields = db.query(FieldModel).filter(FieldModel.id.in_(field_ids)).all()
        field_map = {str(f.id): f.name for f in fields}

    # ── Historical accuracy by crop type ──────────────────────────────────
    completed = [c for c in cycles if c.status == CropStatus.HARVESTED
                 and c.expected_yield_kg and c.actual_yield_kg
                 and float(c.expected_yield_kg) > 0]

    accuracy_by_crop: dict[str, list[float]] = {}
    for c in completed:
        ratio = float(c.actual_yield_kg) / float(c.expected_yield_kg)
        accuracy_by_crop.setdefault(c.crop_name, []).append(ratio)

    crop_accuracy = {
        crop: round(sum(ratios) / len(ratios), 3)
        for crop, ratios in accuracy_by_crop.items()
    }
    overall_accuracy = (
        round(sum(crop_accuracy.values()) / len(crop_accuracy), 3)
        if crop_accuracy else 0.75
    )

    # ── Completed cycles summary ──────────────────────────────────────────
    completed_summary = []
    for c in sorted(completed, key=lambda x: x.actual_harvest_date or date.min, reverse=True):
        ratio = float(c.actual_yield_kg) / float(c.expected_yield_kg)
        total_cost = sum(float(x or 0) for x in [c.seed_cost, c.fertilizer_cost, c.labor_cost, c.other_cost])
        rev_per_kg = 0.0  # no price data model; left for future
        completed_summary.append({
            "id": str(c.id),
            "field_name": field_map.get(str(c.field_id), "Unknown Field"),
            "crop_name": c.crop_name,
            "variety": c.variety,
            "sowing_date": c.sowing_date.isoformat() if c.sowing_date else None,
            "harvest_date": c.actual_harvest_date.isoformat() if c.actual_harvest_date else None,
            "expected_yield_kg": float(c.expected_yield_kg),
            "actual_yield_kg": float(c.actual_yield_kg),
            "accuracy_pct": round(ratio * 100, 1),
            "total_cost_pkr": round(total_cost, 2),
            "status": "above_estimate" if ratio >= 1 else "below_estimate",
        })

    # ── Active / upcoming cycles with projected yield ─────────────────────
    active = [c for c in cycles if c.status in (CropStatus.GROWING, CropStatus.PLANNED)]
    active_forecast = []
    for c in sorted(active, key=lambda x: x.expected_harvest_date or date.max):
        accuracy = crop_accuracy.get(c.crop_name, overall_accuracy)
        exp_yield = float(c.expected_yield_kg or 0)
        projected = round(exp_yield * accuracy, 2)

        days_to_harvest = None
        harvest_status = "unknown"
        if c.expected_harvest_date:
            days_to_harvest = (c.expected_harvest_date - today).days
            if days_to_harvest < 0:
                harvest_status = "overdue"
            elif days_to_harvest <= 14:
                harvest_status = "imminent"
            elif days_to_harvest <= 30:
                harvest_status = "upcoming"
            else:
                harvest_status = "on_track"

        total_cost = sum(float(x or 0) for x in [c.seed_cost, c.fertilizer_cost, c.labor_cost, c.other_cost])
        active_forecast.append({
            "id": str(c.id),
            "field_name": field_map.get(str(c.field_id), "Unknown Field"),
            "crop_name": c.crop_name,
            "variety": c.variety,
            "sowing_date": c.sowing_date.isoformat() if c.sowing_date else None,
            "expected_harvest_date": c.expected_harvest_date.isoformat() if c.expected_harvest_date else None,
            "days_to_harvest": days_to_harvest,
            "harvest_status": harvest_status,
            "crop_status": c.status,
            "expected_yield_kg": exp_yield,
            "projected_yield_kg": projected,
            "accuracy_used": round(accuracy * 100, 1),
            "confidence": "high" if c.crop_name in crop_accuracy else "medium",
            "total_cost_pkr": round(total_cost, 2),
        })

    # ── Seasonal recommendation ───────────────────────────────────────────
    current_month = today.month
    recommendations = []
    if 10 <= current_month <= 12 or current_month == 1:
        recommendations.append("Berseem / Lucerne season — good for goat & buffalo fodder.")
    if 3 <= current_month <= 5:
        recommendations.append("Maize planting season — high feed value crop.")
    if 6 <= current_month <= 8:
        recommendations.append("Sorghum / Sudan grass — drought-tolerant summer fodder.")
    if current_month in (2, 9):
        recommendations.append("Transition month — good time to plan next crop cycle.")

    return {
        "overall_yield_accuracy_pct": round(overall_accuracy * 100, 1),
        "crop_accuracy": {k: round(v * 100, 1) for k, v in crop_accuracy.items()},
        "total_cycles": len(cycles),
        "completed_cycles": len(completed),
        "active_cycles": len(active),
        "completed_summary": completed_summary,
        "active_forecast": active_forecast,
        "seasonal_recommendations": recommendations,
    }
