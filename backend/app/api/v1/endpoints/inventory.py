from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Product, InventoryTransaction, User, InventoryTxType
from app.schemas.schemas import ProductCreate, ProductOut, InventoryTxCreate, InventoryTxOut

router = APIRouter(tags=["Inventory"])
prod_router = APIRouter(prefix="/products")
tx_router = APIRouter(prefix="/inventory-transactions")


def get_org(u): return u.organization_id


@prod_router.get("")
def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    category: Optional[str] = None,
    low_stock: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(Product.organization_id == get_org(current_user), Product.is_active == True)
    if category:
        query = query.filter(Product.category == category)
    if low_stock:
        query = query.filter(Product.current_stock <= Product.min_stock_level)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    total = query.count()
    items = query.order_by(Product.name).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [ProductOut.from_orm(p) for p in items]}}


@prod_router.get("/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.organization_id == get_org(current_user)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "data": ProductOut.from_orm(p)}


@prod_router.post("")
def create_product(payload: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = Product(organization_id=get_org(current_user), **payload.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"success": True, "data": ProductOut.from_orm(p)}


@prod_router.put("/{product_id}")
def update_product(product_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.organization_id == get_org(current_user)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(p, k):
            setattr(p, k, v)
    db.commit()
    return {"success": True, "data": ProductOut.from_orm(p)}


@prod_router.delete("/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.organization_id == get_org(current_user)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    p.is_active = False
    db.commit()
    return {"success": True, "message": "Product removed"}


@tx_router.get("")
def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    product_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryTransaction).filter(InventoryTransaction.organization_id == get_org(current_user))
    if product_id:
        query = query.filter(InventoryTransaction.product_id == product_id)
    total = query.count()
    items = query.order_by(InventoryTransaction.transaction_date.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [InventoryTxOut.from_orm(t) for t in items]}}


@tx_router.post("")
def create_transaction(payload: InventoryTxCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == payload.product_id, Product.organization_id == get_org(current_user)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    tx = InventoryTransaction(organization_id=get_org(current_user), created_by=current_user.id, **payload.dict())
    db.add(tx)

    # Update stock
    if payload.transaction_type == InventoryTxType.IN:
        product.current_stock = (product.current_stock or 0) + payload.quantity
    elif payload.transaction_type == InventoryTxType.OUT:
        if (product.current_stock or 0) < payload.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        product.current_stock = (product.current_stock or 0) - payload.quantity
    else:
        product.current_stock = payload.quantity

    db.commit()
    db.refresh(tx)
    return {"success": True, "data": InventoryTxOut.from_orm(tx)}


router.include_router(prod_router)
router.include_router(tx_router)
