from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, get_current_user
from app.db import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    lead_id: str | None = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
):
    query = db.query(Notification)
    if lead_id:
        query = query.filter(Notification.lead_id == lead_id)
    if current.role == "sales_representative":
        # Reps only see notifications addressed to them, not every rep-role notification —
        # managers/admin/executive/auditor keep broader oversight visibility.
        query = query.filter(Notification.recipient == current.phone)
    return query.order_by(Notification.created_at.desc()).limit(limit).all()
