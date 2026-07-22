from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, managers_and_admin
from app.db import get_db
from app.workers.boss_digest import run_boss_digest
from app.workers.reminder_worker import run_reminder_check

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.post("/run")
def run_reminders(db: Session = Depends(get_db), current: CurrentUser = Depends(managers_and_admin)):
    """Manually trigger the reminder/escalation sweep (normally runs hourly via the scheduler)."""
    result = run_reminder_check(db)
    return {"triggered_by": current.email, "result": result}


@router.post("/boss-digest")
def trigger_boss_digest(db: Session = Depends(get_db), current: CurrentUser = Depends(managers_and_admin)):
    """Manually trigger the boss digest (normally runs daily at 9am via the scheduler)."""
    result = run_boss_digest(db)
    return {"triggered_by": current.email, "result": result}
