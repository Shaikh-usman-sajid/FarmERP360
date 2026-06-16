from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User, UserRole

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles):
    # Accept enums, strings, or a single list argument
    def _to_str(r):
        return r.value if hasattr(r, 'value') else r

    def checker(current_user: User = Depends(get_current_user)):
        if len(roles) == 1 and isinstance(roles[0], list):
            allowed = [_to_str(r) for r in roles[0]]
        else:
            allowed = [_to_str(r) for r in roles]
        user_role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed}"
            )
        return current_user
    return checker


def get_org_id(current_user: User = Depends(get_current_user)) -> str:
    return current_user.organization_id
