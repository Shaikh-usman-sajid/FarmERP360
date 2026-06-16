from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date
from decimal import Decimal
import uuid as uuid_lib
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import (
    Investor, InvestorCapital, ProfitDistribution, AnimalOwnership, Animal,
    User, UserRole
)
from app.schemas.schemas import (
    InvestorCreate, InvestorOut, InvestorCapitalCreate,
    ProfitDistributionCreate, ProfitDistributionOut,
    InvestorROI, InvestorPortfolioAnimal
)

router = APIRouter(tags=["Investors"])

MGMT_ROLES = ["super_admin", "owner", "accountant"]


def get_org(u): return u.organization_id


# ─── INVESTOR CRUD ─────────────────────────────────────────────────────────

@router.get("/investors")
def list_investors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner", "accountant", "investor"]))
):
    items = db.query(Investor).filter(
        Investor.organization_id == get_org(current_user),
        Investor.is_active == True
    ).all()
    return {"success": True, "data": [InvestorOut.from_orm(i).dict() for i in items]}


@router.post("/investors")
def create_investor(
    payload: InvestorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"]))
):
    i = Investor(id=str(uuid_lib.uuid4()), organization_id=get_org(current_user), **payload.dict())
    db.add(i)
    db.commit()
    db.refresh(i)
    return {"success": True, "data": InvestorOut.from_orm(i).dict()}


# ─── CAPITAL CONTRIBUTIONS ────────────────────────────────────────────────

@router.post("/investors/capital")
def add_capital(
    payload: InvestorCapitalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MGMT_ROLES))
):
    investor = db.query(Investor).filter(
        Investor.id == payload.investor_id,
        Investor.organization_id == get_org(current_user)
    ).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    c = InvestorCapital(id=str(uuid_lib.uuid4()), organization_id=get_org(current_user), **payload.dict())
    db.add(c)
    investor.total_capital = (investor.total_capital or 0) + payload.amount
    db.commit()
    return {"success": True, "message": "Capital added", "data": {"new_total": float(investor.total_capital)}}


@router.get("/investors/{inv_id}/capital")
def get_capital_history(inv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    investor = db.query(Investor).filter(Investor.id == inv_id, Investor.organization_id == get_org(current_user)).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    contributions = db.query(InvestorCapital).filter(
        InvestorCapital.investor_id == inv_id,
        InvestorCapital.organization_id == get_org(current_user)
    ).order_by(InvestorCapital.contribution_date.desc()).all()
    return {"success": True, "data": [
        {"id": c.id, "amount": float(c.amount), "contribution_date": str(c.contribution_date),
         "type": c.type, "notes": c.notes} for c in contributions
    ]}


# ─── PROFIT DISTRIBUTIONS ────────────────────────────────────────────────

@router.get("/investors/distributions")
def list_distributions(
    investor_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MGMT_ROLES))
):
    q = db.query(ProfitDistribution).filter(ProfitDistribution.organization_id == get_org(current_user))
    if investor_id:
        q = q.filter(ProfitDistribution.investor_id == investor_id)
    items = q.order_by(ProfitDistribution.distribution_date.desc()).all()
    return {"success": True, "data": [ProfitDistributionOut.from_orm(d).dict() for d in items]}


@router.post("/investors/distributions")
def create_distribution(
    payload: ProfitDistributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MGMT_ROLES))
):
    investor = db.query(Investor).filter(
        Investor.id == payload.investor_id,
        Investor.organization_id == get_org(current_user)
    ).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    d = ProfitDistribution(id=str(uuid_lib.uuid4()), organization_id=get_org(current_user), **payload.dict())
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"success": True, "data": ProfitDistributionOut.from_orm(d).dict()}


@router.get("/investors/{inv_id}/distributions")
def investor_distributions(inv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(ProfitDistribution).filter(
        ProfitDistribution.investor_id == inv_id,
        ProfitDistribution.organization_id == get_org(current_user)
    ).order_by(ProfitDistribution.distribution_date.desc()).all()
    return {"success": True, "data": [ProfitDistributionOut.from_orm(d).dict() for d in items]}


# ─── PORTFOLIO ───────────────────────────────────────────────────────────

@router.get("/investors/{inv_id}/portfolio")
def get_portfolio(inv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    investor = db.query(Investor).filter(Investor.id == inv_id, Investor.organization_id == get_org(current_user)).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")

    ownerships = db.query(AnimalOwnership).filter(
        AnimalOwnership.owner_user_id == investor.user_id,
        AnimalOwnership.is_current == True
    ).all() if investor.user_id else []

    animals_data = []
    for o in ownerships:
        animal = db.query(Animal).filter(Animal.id == o.animal_id).first()
        if animal:
            animals_data.append({
                "animal_id": animal.id,
                "animal_code": animal.animal_code,
                "name": animal.name,
                "breed": animal.breed,
                "species": animal.species.value if animal.species else None,
                "gender": animal.gender.value if animal.gender else None,
                "status": animal.status.value if animal.status else None,
                "ownership_percentage": float(o.ownership_percentage),
                "start_date": str(o.start_date),
            })

    total_invested = float(investor.total_capital or 0)
    total_distributed = float(
        db.query(func.sum(ProfitDistribution.amount)).filter(
            ProfitDistribution.investor_id == inv_id,
            ProfitDistribution.organization_id == get_org(current_user)
        ).scalar() or 0
    )

    return {"success": True, "data": {
        "investor": InvestorOut.from_orm(investor).dict(),
        "animals": animals_data,
        "total_invested": total_invested,
        "total_distributed": total_distributed,
        "roi_percentage": round((total_distributed / total_invested * 100), 2) if total_invested > 0 else 0,
        "net_position": round(total_distributed - total_invested, 2),
    }}


# ─── REPORTS ─────────────────────────────────────────────────────────────

@router.get("/investors/reports/summary")
def investor_summary(db: Session = Depends(get_db), current_user: User = Depends(require_roles(MGMT_ROLES))):
    investors = db.query(Investor).filter(
        Investor.organization_id == get_org(current_user),
        Investor.is_active == True
    ).all()

    total_capital = float(sum(i.total_capital or 0 for i in investors))
    total_distributed = float(
        db.query(func.sum(ProfitDistribution.amount)).filter(
            ProfitDistribution.organization_id == get_org(current_user)
        ).scalar() or 0
    )

    rows = []
    for inv in investors:
        invested = float(inv.total_capital or 0)
        dist = float(
            db.query(func.sum(ProfitDistribution.amount)).filter(
                ProfitDistribution.investor_id == inv.id
            ).scalar() or 0
        )
        ownerships_count = 0
        if inv.user_id:
            ownerships_count = db.query(AnimalOwnership).filter(
                AnimalOwnership.owner_user_id == inv.user_id,
                AnimalOwnership.is_current == True
            ).count()
        rows.append({
            "investor_id": inv.id,
            "full_name": inv.full_name,
            "profit_share_percentage": float(inv.profit_share_percentage or 0),
            "total_invested": invested,
            "total_distributed": dist,
            "roi_percentage": round(dist / invested * 100, 2) if invested > 0 else 0,
            "net_position": round(dist - invested, 2),
            "active_animals": ownerships_count,
        })

    return {"success": True, "data": {
        "total_capital": total_capital,
        "total_distributed": total_distributed,
        "investor_count": len(investors),
        "investors": rows,
    }}


# ─── INVESTOR GET / UPDATE (must be after static paths to avoid shadowing) ─

@router.get("/investors/{inv_id}")
def get_investor(inv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Investor).filter(Investor.id == inv_id, Investor.organization_id == get_org(current_user)).first()
    if not i:
        raise HTTPException(status_code=404, detail="Investor not found")
    return {"success": True, "data": InvestorOut.from_orm(i).dict()}


@router.put("/investors/{inv_id}")
def update_investor(inv_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(require_roles(MGMT_ROLES))):
    i = db.query(Investor).filter(Investor.id == inv_id, Investor.organization_id == get_org(current_user)).first()
    if not i:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(i, k):
            setattr(i, k, v)
    db.commit()
    return {"success": True, "data": InvestorOut.from_orm(i).dict()}


# ─── INVESTOR PORTAL ─────────────────────────────────────────────────────

def _get_portal_investor(current_user: User, db: Session) -> Investor:
    investor = db.query(Investor).filter(
        Investor.user_id == current_user.id,
        Investor.organization_id == current_user.organization_id,
    ).first()
    if not investor:
        raise HTTPException(status_code=404, detail="No investor profile linked to this account")
    return investor


@router.get("/investors/portal/me")
def portal_me(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["investor"]))):
    investor = _get_portal_investor(current_user, db)
    total_distributed = float(
        db.query(func.sum(ProfitDistribution.amount)).filter(
            ProfitDistribution.investor_id == investor.id
        ).scalar() or 0
    )
    total_invested = float(investor.total_capital or 0)
    ownerships_count = 0
    if investor.user_id:
        ownerships_count = db.query(AnimalOwnership).filter(
            AnimalOwnership.owner_user_id == investor.user_id,
            AnimalOwnership.is_current == True
        ).count()
    return {"success": True, "data": {
        **InvestorOut.from_orm(investor).dict(),
        "total_distributed": total_distributed,
        "roi_percentage": round(total_distributed / total_invested * 100, 2) if total_invested > 0 else 0,
        "net_position": round(total_distributed - total_invested, 2),
        "active_animals": ownerships_count,
    }}


@router.get("/investors/portal/portfolio")
def portal_portfolio(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["investor"]))):
    investor = _get_portal_investor(current_user, db)
    ownerships = db.query(AnimalOwnership).filter(
        AnimalOwnership.owner_user_id == current_user.id,
        AnimalOwnership.is_current == True
    ).all()
    result = []
    for o in ownerships:
        animal = db.query(Animal).filter(Animal.id == o.animal_id).first()
        if animal:
            result.append({
                "animal_id": animal.id,
                "animal_code": animal.animal_code,
                "name": animal.name,
                "breed": animal.breed,
                "species": animal.species.value if animal.species else None,
                "gender": animal.gender.value if animal.gender else None,
                "status": animal.status.value if animal.status else None,
                "ownership_percentage": float(o.ownership_percentage),
                "start_date": str(o.start_date),
            })
    return {"success": True, "data": result}


@router.get("/investors/portal/distributions")
def portal_distributions(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["investor"]))):
    investor = _get_portal_investor(current_user, db)
    items = db.query(ProfitDistribution).filter(
        ProfitDistribution.investor_id == investor.id,
        ProfitDistribution.organization_id == investor.organization_id
    ).order_by(ProfitDistribution.distribution_date.desc()).all()
    return {"success": True, "data": [ProfitDistributionOut.from_orm(d).dict() for d in items]}


@router.get("/investors/portal/capital")
def portal_capital(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["investor"]))):
    investor = _get_portal_investor(current_user, db)
    contributions = db.query(InvestorCapital).filter(
        InvestorCapital.investor_id == investor.id,
        InvestorCapital.organization_id == investor.organization_id
    ).order_by(InvestorCapital.contribution_date.desc()).all()
    return {"success": True, "data": [
        {"id": c.id, "amount": float(c.amount), "contribution_date": str(c.contribution_date),
         "type": c.type, "notes": c.notes} for c in contributions
    ]}
