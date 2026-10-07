from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, warehouse_roles
from app.db import get_db
from app.services import warehouse_service

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])


@router.get("")
def list_warehouses(db: Session = Depends(get_db), current: CurrentUser = Depends(warehouse_roles)):
    """All warehouses with stock, health, movement and activity, plus network totals and the data source."""
    return warehouse_service.build_network(db)
