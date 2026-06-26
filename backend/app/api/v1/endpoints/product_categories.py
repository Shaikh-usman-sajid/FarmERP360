from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import ProductCategory, User

router = APIRouter(prefix="/product-categories", tags=["product-categories"])


@router.get("")
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cats = (
        db.query(ProductCategory)
        .filter(
            ProductCategory.organization_id == current_user.organization_id,
            ProductCategory.is_active == True,
        )
        .order_by(ProductCategory.name)
        .all()
    )
    return {"data": [{"id": c.id, "name": c.name} for c in cats]}


@router.post("")
def create_category(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"])),
):
    if not payload.get("name", "").strip():
        raise HTTPException(status_code=400, detail="Name is required")
    cat = ProductCategory(
        organization_id=current_user.organization_id,
        name=payload["name"].strip(),
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"data": {"id": cat.id, "name": cat.name}}


@router.put("/{cat_id}")
def update_category(
    cat_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"])),
):
    cat = (
        db.query(ProductCategory)
        .filter(
            ProductCategory.id == cat_id,
            ProductCategory.organization_id == current_user.organization_id,
            ProductCategory.is_active == True,
        )
        .first()
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if payload.get("name", "").strip():
        cat.name = payload["name"].strip()
    db.commit()
    return {"data": {"id": cat.id, "name": cat.name}}


@router.delete("/{cat_id}")
def delete_category(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"])),
):
    cat = (
        db.query(ProductCategory)
        .filter(
            ProductCategory.id == cat_id,
            ProductCategory.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.is_active = False
    db.commit()
    return {"data": "deleted"}
