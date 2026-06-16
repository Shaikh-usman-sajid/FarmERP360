from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from app.core.database import get_db
from app.core.security import (
    verify_password, hash_password,
    create_access_token, create_refresh_token, decode_token
)
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.models import User, AuditLog
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshRequest, ChangePasswordRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token({"sub": user.id, "role": user.role.value, "org": user.organization_id})
    refresh_token = create_refresh_token({"sub": user.id})

    log = AuditLog(
        organization_id=user.organization_id,
        user_id=user.id,
        action="login",
        module="auth",
        ip_address=request.client.host if request.client else None
    )
    db.add(log)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "organization_id": user.organization_id
        }
    )


@router.post("/refresh")
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == data["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    access_token = create_access_token({"sub": user.id, "role": user.role.value, "org": user.organization_id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"success": True, "message": "Logged out successfully"}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"success": True, "message": "Password changed successfully"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "organization_id": current_user.organization_id,
        "is_active": current_user.is_active,
        "last_login": current_user.last_login
    }
