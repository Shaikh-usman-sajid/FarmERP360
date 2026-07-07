import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.config import settings
from app.models.models import Employee, AttendanceRecord, User, UserRole, EmployeeSalaryHistory
from app.schemas.schemas import (
    EmployeeCreate, EmployeeOut, AttendanceCreate, AttendanceOut,
    SalaryHistoryCreate, SalaryHistoryOut,
)

router = APIRouter(tags=["Employees"])
emp_router = APIRouter(prefix="/employees")
att_router = APIRouter(prefix="/attendance")

HR_ROLES = [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.FARM_MANAGER]


def get_org(u): return u.organization_id


@emp_router.get("")
def list_employees(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    department: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in HR_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    query = db.query(Employee).filter(Employee.organization_id == get_org(current_user))
    if department:
        query = query.filter(Employee.department == department)
    if search:
        query = query.filter(Employee.full_name.ilike(f"%{search}%"))
    if status:
        query = query.filter(Employee.status == status)
    total = query.count()
    items = query.order_by(Employee.full_name).offset((page-1)*per_page).limit(per_page).all()
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
    current_user: User = Depends(require_roles(*HR_ROLES))
):
    e = Employee(organization_id=get_org(current_user), **payload.dict())
    db.add(e)
    db.flush()
    # Auto-record initial salary if provided
    if payload.monthly_salary:
        hist = EmployeeSalaryHistory(
            organization_id=get_org(current_user),
            employee_id=e.id,
            salary_amount=payload.monthly_salary,
            previous_salary=None,
            effective_date=payload.join_date or date.today(),
            change_reason="Initial Appointment",
            created_by=current_user.id,
        )
        db.add(hist)
    db.commit()
    db.refresh(e)
    return {"success": True, "data": EmployeeOut.from_orm(e)}


@emp_router.put("/{emp_id}")
def update_employee(emp_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.organization_id == get_org(current_user)).first()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(e, k) and k not in ("id", "organization_id"):
            setattr(e, k, v)
    db.commit()
    return {"success": True, "data": EmployeeOut.from_orm(e)}


@emp_router.post("/{emp_id}/photo")
async def upload_employee_photo(
    emp_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.organization_id == get_org(current_user)).first()
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")

    upload_dir = f"{settings.UPLOAD_DIR}/employees"
    os.makedirs(upload_dir, exist_ok=True)

    # Delete old photo file if exists
    if e.photo_url:
        old_path = f"{settings.UPLOAD_DIR}/{e.photo_url.lstrip('/uploads/')}"
        if os.path.exists(old_path):
            os.remove(old_path)

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"{upload_dir}/{filename}"

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    e.photo_url = f"/uploads/employees/{filename}"
    db.commit()
    return {"success": True, "data": {"photo_url": e.photo_url}}


@emp_router.get("/{emp_id}/salary-history")
def get_salary_history(
    emp_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.organization_id == get_org(current_user)).first()
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    history = (
        db.query(EmployeeSalaryHistory)
        .filter(EmployeeSalaryHistory.employee_id == emp_id)
        .order_by(EmployeeSalaryHistory.effective_date.desc())
        .all()
    )
    return {"success": True, "data": [SalaryHistoryOut.from_orm(h) for h in history]}


@emp_router.post("/{emp_id}/salary")
def add_salary_record(
    emp_id: str,
    payload: SalaryHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*HR_ROLES)),
):
    e = db.query(Employee).filter(Employee.id == emp_id, Employee.organization_id == get_org(current_user)).first()
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")

    prev_salary = e.monthly_salary
    hist = EmployeeSalaryHistory(
        organization_id=get_org(current_user),
        employee_id=emp_id,
        salary_amount=payload.salary_amount,
        previous_salary=prev_salary,
        effective_date=payload.effective_date,
        change_reason=payload.change_reason,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(hist)
    # Update current salary
    e.monthly_salary = payload.salary_amount
    db.commit()
    db.refresh(hist)
    return {"success": True, "data": SalaryHistoryOut.from_orm(hist)}


@emp_router.get("/salary-history/all")
def list_all_salary_history(
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in HR_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    q = (
        db.query(EmployeeSalaryHistory)
        .join(Employee, EmployeeSalaryHistory.employee_id == Employee.id)
        .filter(EmployeeSalaryHistory.organization_id == get_org(current_user))
    )
    if employee_id:
        q = q.filter(EmployeeSalaryHistory.employee_id == employee_id)
    records = q.order_by(EmployeeSalaryHistory.effective_date.desc()).all()

    result = []
    for h in records:
        emp = db.query(Employee).filter(Employee.id == h.employee_id).first()
        result.append({
            "id": h.id,
            "employee_id": h.employee_id,
            "employee_name": emp.full_name if emp else "",
            "employee_code": emp.employee_code if emp else "",
            "salary_amount": str(h.salary_amount),
            "previous_salary": str(h.previous_salary) if h.previous_salary else None,
            "effective_date": str(h.effective_date),
            "change_reason": h.change_reason,
            "notes": h.notes,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        })
    return {"success": True, "data": result}


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
