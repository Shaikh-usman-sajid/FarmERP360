from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import CustomerCategory, Customer, User, UserRole
from app.schemas.schemas import (
    CustomerCategoryCreate, CustomerCategoryOut,
    CustomerCreate, CustomerOut,
)

router = APIRouter(tags=["Customers"])

ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.OWNER]


def _org(u: User) -> str:
    return str(u.organization_id)


# ─── CUSTOMER CATEGORIES ───────────────────────────────

@router.get("/customer-categories")
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cats = db.query(CustomerCategory).filter(
        CustomerCategory.organization_id == _org(current_user),
    ).order_by(CustomerCategory.name).all()
    result = []
    for c in cats:
        d = CustomerCategoryOut.from_orm(c).dict()
        d["customer_count"] = db.query(Customer).filter(
            Customer.category_id == c.id,
            Customer.is_active == True,
        ).count()
        result.append(d)
    return {"success": True, "data": result}


@router.post("/customer-categories")
def create_category(
    payload: CustomerCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    existing = db.query(CustomerCategory).filter(
        CustomerCategory.organization_id == _org(current_user),
        CustomerCategory.name == payload.name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    cat = CustomerCategory(organization_id=_org(current_user), **payload.dict())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"success": True, "data": CustomerCategoryOut.from_orm(cat)}


@router.put("/customer-categories/{cat_id}")
def update_category(
    cat_id: str,
    payload: CustomerCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    cat = db.query(CustomerCategory).filter(
        CustomerCategory.id == cat_id,
        CustomerCategory.organization_id == _org(current_user),
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.dict().items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return {"success": True, "data": CustomerCategoryOut.from_orm(cat)}


@router.delete("/customer-categories/{cat_id}")
def delete_category(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    cat = db.query(CustomerCategory).filter(
        CustomerCategory.id == cat_id,
        CustomerCategory.organization_id == _org(current_user),
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    has_customers = db.query(Customer).filter(Customer.category_id == cat_id).first()
    if has_customers:
        raise HTTPException(status_code=400, detail="Cannot delete — category has customers assigned")
    db.delete(cat)
    db.commit()
    return {"success": True, "message": "Deleted"}


# ─── CUSTOMERS ─────────────────────────────────────────

def _customer_out(c: Customer) -> dict:
    d = CustomerOut.from_orm(c).dict()
    d["category_name"] = c.category.name if c.category else None
    return d


@router.get("/customers")
def list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=500),
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload
    from sqlalchemy import or_
    q = db.query(Customer).options(joinedload(Customer.category)).filter(
        Customer.organization_id == _org(current_user),
    )
    if category_id:
        q = q.filter(Customer.category_id == category_id)
    if is_active is not None:
        q = q.filter(Customer.is_active == is_active)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            Customer.name.ilike(like),
            Customer.phone.ilike(like),
            Customer.cnic.ilike(like),
            Customer.city.ilike(like),
        ))
    total = q.count()
    items = q.order_by(Customer.name).offset((page - 1) * per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [_customer_out(c) for c in items]}}


@router.post("/customers")
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    from sqlalchemy.orm import joinedload
    c = Customer(organization_id=_org(current_user), **payload.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    c = db.query(Customer).options(joinedload(Customer.category)).filter(Customer.id == c.id).first()
    return {"success": True, "data": _customer_out(c)}


@router.put("/customers/{cust_id}")
def update_customer(
    cust_id: str,
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    from sqlalchemy.orm import joinedload
    c = db.query(Customer).filter(
        Customer.id == cust_id,
        Customer.organization_id == _org(current_user),
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.dict().items():
        setattr(c, k, v)
    db.commit()
    c = db.query(Customer).options(joinedload(Customer.category)).filter(Customer.id == c.id).first()
    return {"success": True, "data": _customer_out(c)}


@router.delete("/customers/{cust_id}")
def delete_customer(
    cust_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    c = db.query(Customer).filter(
        Customer.id == cust_id,
        Customer.organization_id == _org(current_user),
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    c.is_active = False
    db.commit()
    return {"success": True, "message": "Customer deactivated"}
