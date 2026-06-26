from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import VaccineType, User
from app.schemas.schemas import VaccineTypeCreate, VaccineTypeOut

router = APIRouter(prefix="/vaccine-types", tags=["VaccineTypes"])


def get_org(u): return u.organization_id


@router.get("")
def list_vaccine_types(
    species: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(VaccineType).filter(
        VaccineType.organization_id == get_org(current_user),
        VaccineType.is_active == True,
    )
    if species:
        query = query.filter(
            (VaccineType.species == species) | (VaccineType.species == None)
        )
    if type:
        query = query.filter(VaccineType.type == type)
    items = query.order_by(VaccineType.name).all()
    return {"success": True, "data": [VaccineTypeOut.from_orm(i) for i in items]}


@router.post("")
def create_vaccine_type(
    payload: VaccineTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = VaccineType(
        organization_id=get_org(current_user),
        name=payload.name,
        species=payload.species or None,
        type=payload.type,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"success": True, "data": VaccineTypeOut.from_orm(item)}


@router.put("/{item_id}")
def update_vaccine_type(
    item_id: str,
    payload: VaccineTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(VaccineType).filter(
        VaccineType.id == item_id,
        VaccineType.organization_id == get_org(current_user),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.name = payload.name
    item.species = payload.species or None
    item.type = payload.type
    db.commit()
    return {"success": True, "data": VaccineTypeOut.from_orm(item)}


@router.delete("/{item_id}")
def delete_vaccine_type(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(VaccineType).filter(
        VaccineType.id == item_id,
        VaccineType.organization_id == get_org(current_user),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.is_active = False
    db.commit()
    return {"success": True, "message": "Deleted"}
