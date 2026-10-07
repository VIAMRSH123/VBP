import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, admin_only, any_authenticated, managers_and_admin
from app.db import SessionLocal, get_db
from app.models.sap import SapSyncRun
from app.services import sap_sync_service as sync

router = APIRouter(prefix="/api/sap", tags=["sap"])
logger = logging.getLogger("sap.api")


def _run_in_background(scope: str, force_backfill: bool, triggered_by: str) -> None:
    db = SessionLocal()
    try:
        sync.run_sync(db, scope=scope, force_backfill=force_backfill, triggered_by=triggered_by)
    except sync.SapSyncError as exc:
        logger.warning("Manual SAP sync did not run: %s", exc)
    except Exception:  # noqa: BLE001
        logger.exception("Manual SAP sync crashed")
    finally:
        db.close()


@router.get("/status")
def sap_status(db: Session = Depends(get_db), current: CurrentUser = Depends(any_authenticated)):
    """Mode, last run and freshness. Error details are only included for administrators."""
    return sync.get_status(db, include_errors=current.role == "administrator")


@router.get("/runs")
def sap_runs(limit: int = 20, db: Session = Depends(get_db), current: CurrentUser = Depends(admin_only)):
    rows = db.query(SapSyncRun).order_by(SapSyncRun.started_at.desc()).limit(min(limit, 100)).all()
    return [{**sync._run_summary(r), "error_details": r.error_details} for r in rows]


@router.post("/sync", status_code=202)
def trigger_sync(
    background: BackgroundTasks,
    mode: str = "incremental",
    scope: str = "all",
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(managers_and_admin),
):
    """Starts a sync in the background; poll GET /api/sap/status (`running`) for progress."""
    if mode not in ("incremental", "backfill") or scope not in ("all", "stock"):
        raise HTTPException(status_code=422, detail="mode must be incremental|backfill and scope all|stock")
    if mode == "backfill" and current.role != "administrator":
        raise HTTPException(status_code=403, detail="Only administrators can run a full backfill")
    try:
        sync.preflight(db)
    except sync.SapNotEnabled as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (sync.SyncAlreadyRunning, sync.MockDataPresent) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    background.add_task(_run_in_background, scope, mode == "backfill", current.email)
    return {"accepted": True, "mode": mode, "scope": scope}


@router.post("/purge-mock")
def purge_mock(db: Session = Depends(get_db), current: CurrentUser = Depends(admin_only)):
    """Deletes all demo data created by the mock SAP so a real SAP can take over."""
    return {"removed": sync.purge_mock_data(db)}
