from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.security import hash_password
from app.models.models import User, UserRole
from app.schemas.schemas import UserCreate, UserUpdate, UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("")
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OWNER))
):
    query = db.query(User).filter(User.organization_id == current_user.organization_id)
    if search:
        query = query.filter(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    if role:
        query = query.filter(User.role == role)
    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "page": page, "per_page": per_page, "items": [UserOut.from_orm(u) for u in users]}}


@router.get("/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id, User.organization_id == current_user.organization_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "data": UserOut.from_orm(user)}


@router.post("")
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OWNER))
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        organization_id=current_user.organization_id,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "message": "User created", "data": UserOut.from_orm(user)}


@router.put("/{user_id}")
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OWNER))
):
    user = db.query(User).filter(User.id == user_id, User.organization_id == current_user.organization_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.dict(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return {"success": True, "data": UserOut.from_orm(user)}


@router.delete("/{user_id}")
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OWNER))
):
    user = db.query(User).filter(User.id == user_id, User.organization_id == current_user.organization_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"success": True, "message": "User deactivated"}
