"""Runs one SAP sync: masters -> stock -> documents -> movements (leads are added by sap_leads_sync).

Guarantees: one run at a time (process lock + DB check), per-entity failure isolation (the run ends
`partial` instead of aborting), per-entity cursors that only advance for entities that succeeded, and
idempotent upserts so overlapping history is harmless.
"""
import json
import logging
import threading
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.integrations import sap_client
from app.integrations.sap_client import SapError
from app.models.activity import LeadActivity, LeadStatusHistory
from app.models.inventory import StockLevel, StockMovement, Warehouse
from app.models.lead import Customer, Lead, Product
from app.models.notification import Notification, ReminderQueue
from app.models.representative import Representative
from app.models.sap import BronzeSapRaw, SapDocument, SapLookup, SapSyncRun, SapSyncState
from app.services import sap_leads_sync as leads_sync
from app.services import sap_masters_sync as masters
from app.services.sap_mapper import utc_now_iso

logger = logging.getLogger("sap.sync")

_RUN_LOCK = threading.Lock()
STALE_RUN_MINUTES = 30
TERMINAL_STATUSES = ("Won", "Lost", "Archived")
MOCK_SYSTEM = "sap_b1_mock"


class SapSyncError(Exception):
    pass


class SapNotEnabled(SapSyncError):
    pass


class SyncAlreadyRunning(SapSyncError):
    pass


class MockDataPresent(SapSyncError):
    pass


# --- cursors ---------------------------------------------------------------------------------


def get_cursor(db: Session, ext: str, entity: str) -> date | None:
    row = db.query(SapSyncState).filter(SapSyncState.external_system == ext, SapSyncState.entity == entity).first()
    return date.fromisoformat(row.cursor_date) if row and row.cursor_date else None


def set_cursor(db: Session, ext: str, entity: str, value: date, *, full: bool = False) -> None:
    row = db.query(SapSyncState).filter(SapSyncState.external_system == ext, SapSyncState.entity == entity).first()
    if row is None:
        row = SapSyncState(external_system=ext, entity=entity)
        db.add(row)
    row.cursor_date = value.isoformat()
    if full:
        row.last_full_sync_at = utc_now_iso()
    db.commit()


def since_for(db: Session, ext: str, entity: str, *, backfill: bool, settings: Settings, today: date) -> date:
    """Backfill reads `sap_backfill_days` of history; incremental re-reads from one day before the cursor."""
    cursor = None if backfill else get_cursor(db, ext, entity)
    if cursor is None:
        return today - timedelta(days=settings.sap_backfill_days)
    return cursor - timedelta(days=1)


# --- guards ----------------------------------------------------------------------------------


def has_mock_data(db: Session) -> bool:
    for model in (Warehouse, Customer, SapSyncRun, Lead):
        if db.query(model.id).filter(model.external_system == MOCK_SYSTEM).first():
            return True
    return False


def _fail_stale_runs(db: Session, ext: str) -> None:
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=STALE_RUN_MINUTES)).isoformat()
    stale = db.query(SapSyncRun).filter(SapSyncRun.external_system == ext, SapSyncRun.status == "running", SapSyncRun.started_at < cutoff).all()
    for run in stale:
        run.status, run.ended_at, run.error_details = "failed", utc_now_iso(), "Run abandoned (process stopped or timed out)"
    if stale:
        db.commit()


def _running_run(db: Session, ext: str) -> SapSyncRun | None:
    return db.query(SapSyncRun).filter(SapSyncRun.external_system == ext, SapSyncRun.status == "running").first()


# --- the run ---------------------------------------------------------------------------------


def preflight(db: Session) -> Settings:
    """Raises a SapSyncError if a sync cannot start right now; returns the settings otherwise."""
    settings = get_settings()
    if not settings.sap_enabled:
        raise SapNotEnabled("SAP sync is off (SAP_MODE=off)")
    if settings.sap_mode_normalized == "live":
        if not settings.use_real_sap:
            raise SapNotEnabled("SAP_MODE=live needs SAP_BASE_URL, SAP_COMPANY_DB, SAP_USERNAME and SAP_PASSWORD")
        if has_mock_data(db):
            raise MockDataPresent("Mock SAP data is still in the database; purge it before the first live sync")
    ext = settings.sap_external_system
    _fail_stale_runs(db, ext)
    if _RUN_LOCK.locked() or _running_run(db, ext):
        raise SyncAlreadyRunning("A SAP sync is already running")
    return settings


def run_sync(db: Session, *, scope: str = "all", force_backfill: bool = False, triggered_by: str = "scheduler") -> SapSyncRun:
    settings = preflight(db)
    ext = settings.sap_external_system

    if not _RUN_LOCK.acquire(blocking=False):
        raise SyncAlreadyRunning("A SAP sync is already running")
    try:
        _fail_stale_runs(db, ext)
        if _running_run(db, ext):
            raise SyncAlreadyRunning("A SAP sync is already running")

        today = date.today()
        first_run = get_cursor(db, ext, "BusinessPartners") is None
        backfill = force_backfill or first_run
        run = SapSyncRun(
            external_system=ext,
            mode="backfill" if backfill else "incremental",
            scope=scope,
            status="running",
            started_at=utc_now_iso(),
            triggered_by=triggered_by,
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        counts: dict = {}
        errors: list[str] = []
        succeeded: list[str] = []
        partner_rows: list[dict] = []
        lead_stats: list = []

        def step(name: str, fn, cursor_entities: tuple[str, ...] = ()) -> None:
            try:
                fn()
                succeeded.append(name)
                for entity in cursor_entities:
                    set_cursor(db, ext, entity, today, full=backfill)
            except Exception as exc:  # noqa: BLE001 - isolate each entity; the run becomes "partial"
                db.rollback()
                logger.exception("SAP sync step '%s' failed", name)
                errors.append(f"{name}: {exc}")
                masters.bump(counts, name, "failed")

        try:
            with sap_client.session(settings) as sap:
                since = lambda entity: since_for(db, ext, entity, backfill=backfill, settings=settings, today=today)  # noqa: E731
                changed_cards: set[str] = set()

                if scope == "all":
                    step("lookups", lambda: masters.sync_lookups(db, sap, ext, counts))
                step("warehouses", lambda: masters.sync_warehouses(db, sap, ext, counts, settings.sap_warehouse_capacity_field))
                if scope == "all":
                    step("sales_persons", lambda: masters.sync_sales_persons(db, sap, ext, counts, settings.sap_default_country_code))
                step("items_stock", lambda: masters.sync_items_and_stock(db, sap, ext, counts))
                if scope == "all":
                    step(
                        "partners",
                        lambda: partner_rows.extend(
                            masters.sync_partners(db, sap, ext, counts, since("BusinessPartners"), settings.sap_default_country_code)
                        ),
                        ("BusinessPartners",),
                    )

                    def documents() -> None:
                        changed_cards.update(masters.sync_documents(db, sap, ext, counts, since("Orders")))
                        masters.refresh_customer_order_stats(db, ext, changed_cards)

                    step("documents", documents, ("Orders",))

                    def leads() -> None:
                        lead_stats.append(
                            leads_sync.sync_leads(
                                db, sap, ext, counts, settings,
                                backfill=backfill, since=since("SalesOpportunities"),
                                changed_cards=changed_cards, partner_rows=partner_rows,
                                run_id=run.id, today=today,
                            )
                        )
                        if backfill or leads_sync.reconcile_due(db, ext):
                            leads_sync.reconcile_leads(db, sap, ext, counts)

                    step("leads", leads, ("SalesOpportunities",))
                step(
                    "movements",
                    lambda: masters.sync_movements(db, sap, ext, counts, since("DeliveryNotes") if not backfill else None),
                    ("DeliveryNotes",),
                )
        except SapError as exc:  # login failed or the server could not be reached at all
            errors.append(f"connection: {exc}")
        except Exception as exc:  # noqa: BLE001 - never leave the run row stuck in "running"
            db.rollback()
            logger.exception("Unexpected failure during SAP sync")
            errors.append(f"unexpected: {exc}")

        recompute_workload(db, ext)
        try:
            from app.services import dashboard_service

            dashboard_service.refresh_gold_metrics(db)
        except Exception:  # noqa: BLE001 - metrics are derived data; never fail the run over them
            logger.exception("Gold metric refresh failed after SAP sync")

        run.counts = json.dumps(counts)
        if lead_stats:
            run.notifications_suppressed = lead_stats[0].suppressed
        run.error_details = "\n".join(errors)[:4000]
        run.ended_at = utc_now_iso()
        run.status = "success" if not errors else ("partial" if succeeded else "failed")
        db.commit()
        db.refresh(run)
        logger.info("SAP sync %s (%s, %s): %s", run.status, run.mode, scope, counts)
        return run
    finally:
        _RUN_LOCK.release()


def recompute_workload(db: Session, ext: str) -> None:
    """Workload = active leads per rep. Only reps linked to SAP are touched; roster-only reps keep their CSV value."""
    open_leads = dict(
        db.query(Lead.representative_id, func.count(Lead.id))
        .filter(Lead.active_flag == True, Lead.status.notin_(TERMINAL_STATUSES), Lead.representative_id != "")  # noqa: E712
        .group_by(Lead.representative_id)
        .all()
    )
    for rep in db.query(Representative).filter(Representative.external_system == ext):
        rep.workload = int(open_leads.get(rep.id, 0))
    db.commit()


# --- status ----------------------------------------------------------------------------------


def _run_summary(run: SapSyncRun | None) -> dict | None:
    if run is None:
        return None
    return {
        "id": run.id,
        "mode": run.mode,
        "scope": run.scope,
        "status": run.status,
        "started_at": run.started_at,
        "ended_at": run.ended_at,
        "counts": json.loads(run.counts or "{}"),
        "notifications_suppressed": run.notifications_suppressed,
        "triggered_by": run.triggered_by,
    }


def get_status(db: Session, *, include_errors: bool = False) -> dict:
    settings = get_settings()
    ext = settings.sap_external_system
    base = db.query(SapSyncRun).filter(SapSyncRun.external_system == ext)
    last = base.order_by(SapSyncRun.started_at.desc()).first()
    last_ok = base.filter(SapSyncRun.status.in_(("success", "partial"))).order_by(SapSyncRun.ended_at.desc()).first()
    mode = settings.sap_mode_normalized
    status = {
        "mode": mode,
        "enabled": settings.sap_enabled,
        "configured": settings.use_real_sap if mode == "live" else mode == "mock",
        "interval_minutes": settings.sap_sync_interval_minutes,
        "last_run": _run_summary(last),
        "last_success_at": last_ok.ended_at if last_ok else None,
        "running": _running_run(db, ext) is not None,
        "needs_reset": mode == "live" and has_mock_data(db),
    }
    if include_errors and last:
        status["last_error"] = last.error_details
    return status


# --- mock data purge -------------------------------------------------------------------------


def purge_mock_data(db: Session) -> dict[str, int]:
    """Removes everything the mock SAP created (demo data), so a real SAP can take over cleanly."""
    removed: dict[str, int] = {}
    lead_ids = [lid for (lid,) in db.query(Lead.id).filter(Lead.external_system == MOCK_SYSTEM)]
    if lead_ids:
        for model in (LeadActivity, LeadStatusHistory, ReminderQueue, Notification):
            db.query(model).filter(model.lead_id.in_(lead_ids)).delete(synchronize_session=False)
    removed["leads"] = db.query(Lead).filter(Lead.external_system == MOCK_SYSTEM).delete(synchronize_session=False)

    # A roster rep adopted by the mock keeps existing; only its SAP link is cleared.
    for rep in db.query(Representative).filter(Representative.external_system == MOCK_SYSTEM):
        if rep.profile_source == "csv":
            rep.external_system, rep.external_id = "", ""
        else:
            db.delete(rep)
            removed["representatives"] = removed.get("representatives", 0) + 1
    db.flush()

    for model in (BronzeSapRaw, SapDocument, SapLookup, SapSyncState, SapSyncRun, StockLevel, StockMovement, Warehouse, Customer, Product):
        removed[model.__tablename__] = db.query(model).filter(model.external_system == MOCK_SYSTEM).delete(synchronize_session=False)
    db.commit()
    return removed
