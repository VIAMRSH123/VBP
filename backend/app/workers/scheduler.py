"""Scheduler — Blueprint Part 6.

Hourly reminder checks, daily KPI aggregation, dashboard refresh, weekly summaries.
Uses APScheduler's in-process BackgroundScheduler, started from app.main on startup.
"""
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings
from app.db import SessionLocal
from app.services import dashboard_service
from app.workers.boss_digest import run_boss_digest
from app.workers.reminder_worker import run_reminder_check

logger = logging.getLogger("scheduler")

scheduler = BackgroundScheduler()


def _job_reminder_check() -> None:
    db = SessionLocal()
    try:
        run_reminder_check(db)
    finally:
        db.close()


def _job_kpi_aggregation() -> None:
    db = SessionLocal()
    try:
        dashboard_service.refresh_gold_metrics(db)
    finally:
        db.close()


def _job_boss_digest() -> None:
    db = SessionLocal()
    try:
        run_boss_digest(db)
    finally:
        db.close()


def _job_sap_sync(scope: str) -> None:
    from app.services import sap_sync_service

    db = SessionLocal()
    try:
        sap_sync_service.run_sync(db, scope=scope, triggered_by="scheduler")
    except sap_sync_service.SyncAlreadyRunning:
        logger.info("SAP sync (%s) skipped: another run is in progress", scope)
    except sap_sync_service.SapSyncError as exc:
        logger.warning("SAP sync (%s) not started: %s", scope, exc)
    except Exception:  # noqa: BLE001 - a failed sync must never take the scheduler down
        logger.exception("SAP sync (%s) crashed", scope)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    scheduler.add_job(_job_reminder_check, "interval", hours=1, id="reminder_check", replace_existing=True)
    scheduler.add_job(_job_kpi_aggregation, "interval", hours=1, id="kpi_aggregation", replace_existing=True)
    scheduler.add_job(_job_boss_digest, "cron", hour=9, id="boss_digest", replace_existing=True)
    settings = get_settings()
    if settings.sap_enabled:
        first_run = datetime.now() + timedelta(seconds=10)
        scheduler.add_job(
            _job_sap_sync, "interval", args=["all"], minutes=settings.sap_sync_interval_minutes, id="sap_sync",
            max_instances=1, coalesce=True, replace_existing=True, next_run_time=first_run,
        )
        scheduler.add_job(
            _job_sap_sync, "interval", args=["stock"], minutes=settings.sap_stock_interval_minutes, id="sap_stock_sync",
            max_instances=1, coalesce=True, replace_existing=True,
        )
        logger.info("SAP sync scheduled (%s mode): full every %d min, stock every %d min",
                    settings.sap_mode_normalized, settings.sap_sync_interval_minutes, settings.sap_stock_interval_minutes)
    scheduler.start()
    logger.info("Scheduler started: hourly reminder_check + kpi_aggregation, daily boss_digest at 9am")
    return scheduler


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
