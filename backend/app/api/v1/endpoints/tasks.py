from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    Task, TaskStatus, TaskPriority, TaskCategory,
    Employee, Animal, User, UserRole
)

router = APIRouter(tags=["Tasks"])

MANAGER_ROLES = {UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.FARM_MANAGER}


def get_org(u): return u.organization_id


def _is_manager(user: User) -> bool:
    return user.role in MANAGER_ROLES


def _task_dict(t: Task) -> dict:
    return {
        "id": str(t.id),
        "title": t.title,
        "description": t.description,
        "category": t.category.value if t.category else None,
        "priority": t.priority.value if t.priority else None,
        "status": t.status.value if t.status else None,
        "assigned_to_id": str(t.assigned_to_id) if t.assigned_to_id else None,
        "assigned_to_name": t.assigned_to.full_name if t.assigned_to else None,
        "assigned_by_name": t.assigned_by.full_name if t.assigned_by else None,
        "animal_id": str(t.animal_id) if t.animal_id else None,
        "animal_code": t.animal.animal_code if t.animal else None,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "is_overdue": (
            t.due_date is not None
            and t.due_date < date.today()
            and t.status not in (TaskStatus.COMPLETED, TaskStatus.CANCELLED)
        ),
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "completion_notes": t.completion_notes,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


# ─── LIST ─────────────────────────────────────────────────────────────────────

@router.get("/tasks")
def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to_id: Optional[str] = None,
    due_date_from: Optional[date] = None,
    due_date_to: Optional[date] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Task).filter(Task.organization_id == get_org(current_user))

    if status:
        q = q.filter(Task.status == TaskStatus(status))
    if priority:
        q = q.filter(Task.priority == TaskPriority(priority))
    if category:
        q = q.filter(Task.category == TaskCategory(category))
    if assigned_to_id:
        q = q.filter(Task.assigned_to_id == assigned_to_id)
    if due_date_from:
        q = q.filter(Task.due_date >= due_date_from)
    if due_date_to:
        q = q.filter(Task.due_date <= due_date_to)
    if overdue_only:
        q = q.filter(
            Task.due_date < date.today(),
            Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED]),
        )

    tasks = q.order_by(
        Task.status,
        Task.priority.desc(),
        Task.due_date.asc().nullslast(),
    ).all()
    return {"success": True, "data": [_task_dict(t) for t in tasks]}


# ─── MY TASKS (employee sees own) ────────────────────────────────────────────

@router.get("/tasks/my-tasks")
def my_tasks(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Find the employee record linked to this user
    emp = db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.organization_id == get_org(current_user),
    ).first()

    if not emp:
        # Fallback: show all tasks assigned to current user by name match
        return {"success": True, "data": [], "message": "No employee profile linked to this user."}

    q = db.query(Task).filter(
        Task.organization_id == get_org(current_user),
        Task.assigned_to_id == emp.id,
    )
    if status:
        q = q.filter(Task.status == TaskStatus(status))

    tasks = q.order_by(
        Task.status,
        Task.priority.desc(),
        Task.due_date.asc().nullslast(),
    ).all()
    return {"success": True, "data": [_task_dict(t) for t in tasks], "employee": emp.full_name}


# ─── SUMMARY ──────────────────────────────────────────────────────────────────

@router.get("/tasks/summary")
def tasks_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = get_org(current_user)
    today = date.today()

    def count(filters):
        return db.query(func.count(Task.id)).filter(
            Task.organization_id == org_id, *filters
        ).scalar() or 0

    pending = count([Task.status == TaskStatus.PENDING])
    in_progress = count([Task.status == TaskStatus.IN_PROGRESS])
    completed_today = count([
        Task.status == TaskStatus.COMPLETED,
        func.date(Task.completed_at) == today,
    ])
    overdue = count([
        Task.due_date < today,
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED]),
    ])
    due_today = count([
        Task.due_date == today,
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED]),
    ])
    total_open = count([Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED])])

    # Today's active tasks
    todays_tasks = db.query(Task).filter(
        Task.organization_id == org_id,
        Task.due_date == today,
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED]),
    ).order_by(Task.priority.desc()).all()

    # Overdue tasks
    overdue_tasks = db.query(Task).filter(
        Task.organization_id == org_id,
        Task.due_date < today,
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED]),
    ).order_by(Task.due_date.asc()).limit(10).all()

    # By category
    cat_rows = db.query(Task.category, func.count(Task.id)).filter(
        Task.organization_id == org_id,
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED]),
    ).group_by(Task.category).all()
    by_category = [{"category": r[0].value if r[0] else "other", "count": r[1]} for r in cat_rows]

    return {
        "success": True,
        "data": {
            "pending": pending,
            "in_progress": in_progress,
            "completed_today": completed_today,
            "overdue": overdue,
            "due_today": due_today,
            "total_open": total_open,
            "todays_tasks": [_task_dict(t) for t in todays_tasks],
            "overdue_tasks": [_task_dict(t) for t in overdue_tasks],
            "by_category": by_category,
        },
    }


# ─── CREATE ───────────────────────────────────────────────────────────────────

@router.post("/tasks", status_code=201)
def create_task(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_manager(current_user):
        raise HTTPException(403, "Only managers can create tasks")

    task = Task(
        organization_id=get_org(current_user),
        title=body["title"],
        description=body.get("description"),
        category=TaskCategory(body.get("category", "other")),
        priority=TaskPriority(body.get("priority", "medium")),
        status=TaskStatus.PENDING,
        assigned_to_id=body.get("assigned_to_id") or None,
        assigned_by_id=current_user.id,
        animal_id=body.get("animal_id") or None,
        due_date=date.fromisoformat(body["due_date"]) if body.get("due_date") else None,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"success": True, "data": _task_dict(task)}


# ─── GET ──────────────────────────────────────────────────────────────────────

@router.get("/tasks/{task_id}")
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get(task_id, get_org(current_user), db)
    return {"success": True, "data": _task_dict(task)}


# ─── UPDATE ───────────────────────────────────────────────────────────────────

@router.put("/tasks/{task_id}")
def update_task(
    task_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_manager(current_user):
        raise HTTPException(403, "Only managers can edit tasks")
    task = _get(task_id, get_org(current_user), db)

    if "title" in body:
        task.title = body["title"]
    if "description" in body:
        task.description = body["description"]
    if "category" in body:
        task.category = TaskCategory(body["category"])
    if "priority" in body:
        task.priority = TaskPriority(body["priority"])
    if "assigned_to_id" in body:
        task.assigned_to_id = body["assigned_to_id"] or None
    if "animal_id" in body:
        task.animal_id = body["animal_id"] or None
    if "due_date" in body:
        task.due_date = date.fromisoformat(body["due_date"]) if body["due_date"] else None

    db.commit()
    db.refresh(task)
    return {"success": True, "data": _task_dict(task)}


# ─── STATUS TRANSITIONS ───────────────────────────────────────────────────────

@router.post("/tasks/{task_id}/start")
def start_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get(task_id, get_org(current_user), db)
    _assert_can_act(task, current_user, db)
    if task.status != TaskStatus.PENDING:
        raise HTTPException(400, "Only pending tasks can be started")
    task.status = TaskStatus.IN_PROGRESS
    db.commit()
    db.refresh(task)
    return {"success": True, "data": _task_dict(task)}


@router.post("/tasks/{task_id}/complete")
def complete_task(
    task_id: str,
    body: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get(task_id, get_org(current_user), db)
    _assert_can_act(task, current_user, db)
    if task.status == TaskStatus.CANCELLED:
        raise HTTPException(400, "Cannot complete a cancelled task")
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()
    task.completion_notes = body.get("completion_notes")
    db.commit()
    db.refresh(task)
    return {"success": True, "data": _task_dict(task)}


@router.post("/tasks/{task_id}/cancel")
def cancel_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_manager(current_user):
        raise HTTPException(403, "Only managers can cancel tasks")
    task = _get(task_id, get_org(current_user), db)
    if task.status == TaskStatus.COMPLETED:
        raise HTTPException(400, "Cannot cancel a completed task")
    task.status = TaskStatus.CANCELLED
    db.commit()
    db.refresh(task)
    return {"success": True, "data": _task_dict(task)}


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _get(task_id: str, org_id: str, db: Session) -> Task:
    t = db.query(Task).filter(Task.id == task_id, Task.organization_id == org_id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    return t


def _assert_can_act(task: Task, user: User, db: Session):
    """Allow managers or the assigned employee (via linked user_id)."""
    if _is_manager(user):
        return
    emp = db.query(Employee).filter(
        Employee.user_id == user.id,
        Employee.id == task.assigned_to_id,
    ).first()
    if not emp:
        raise HTTPException(403, "You are not assigned to this task")
