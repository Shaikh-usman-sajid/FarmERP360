from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import Employee, AttendanceRecord, User, UserRole
from app.schemas.schemas import EmployeeCreate, EmployeeOut, AttendanceCreate, AttendanceOut

router = APIRouter(tags=["Employees"])
emp_router = APIRouter(prefix="/employees")
att_router = APIRouter(prefix="/attendance")


def get_org(u): return u.organization_id


@emp_router.get("")
def list_employees(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    department: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed = [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.FARM_MANAGER]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    query = db.query(Employee).filter(Employee.organization_id == get_org(current_user))
    if department:
        query = query.filter(Employee.department == department)
    if search:
        query = query.filter(Employee.full_name.ilike(f"%{search}%"))
    total = query.count()
    items = query.offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [EmployeeOut.from_orm(e) for e in items]}}


@emp_router.get("/{emp_id}")
def get_employee(emp_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.organization_id == get_org(current_user)).first()
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"success": True, "data": EmployeeOut.from_orm(e)}


@emp_router.post("")
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.FARM_MANAGER))
):
    e = Employee(organization_id=get_org(current_user), **payload.dict())
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"success": True, "data": EmployeeOut.from_orm(e)}


@emp_router.put("/{emp_id}")
def update_employee(emp_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.organization_id == get_org(current_user)).first()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(e, k):
            setattr(e, k, v)
    db.commit()
    return {"success": True, "data": EmployeeOut.from_orm(e)}


@att_router.get("")
def list_attendance(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    employee_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AttendanceRecord).filter(AttendanceRecord.organization_id == get_org(current_user))
    if employee_id:
        query = query.filter(AttendanceRecord.employee_id == employee_id)
    if date_from:
        query = query.filter(AttendanceRecord.date >= date_from)
    if date_to:
        query = query.filter(AttendanceRecord.date <= date_to)
    total = query.count()
    items = query.order_by(AttendanceRecord.date.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"success": True, "data": {"total": total, "items": [AttendanceOut.from_orm(a) for a in items]}}


@att_router.post("")
def mark_attendance(payload: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check for duplicate
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == payload.employee_id,
        AttendanceRecord.date == payload.date,
        AttendanceRecord.organization_id == get_org(current_user)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this date")
    a = AttendanceRecord(organization_id=get_org(current_user), created_by=current_user.id, **payload.dict())
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"success": True, "data": AttendanceOut.from_orm(a)}


@att_router.put("/{att_id}")
def update_attendance(att_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(AttendanceRecord).filter(AttendanceRecord.id == att_id, AttendanceRecord.organization_id == get_org(current_user)).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(a, k):
            setattr(a, k, v)
    db.commit()
    return {"success": True, "data": AttendanceOut.from_orm(a)}


router.include_router(emp_router)
router.include_router(att_router)
