"""Scheduler — Blueprint Part 6.

Hourly reminder checks, daily KPI aggregation, dashboard refresh, weekly summaries.
Uses APScheduler's in-process BackgroundScheduler, started from app.main on startup.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler

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


def start_scheduler() -> BackgroundScheduler:
    scheduler.add_job(_job_reminder_check, "interval", hours=1, id="reminder_check", replace_existing=True)
    scheduler.add_job(_job_kpi_aggregation, "interval", hours=1, id="kpi_aggregation", replace_existing=True)
    scheduler.add_job(_job_boss_digest, "cron", hour=9, id="boss_digest", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started: hourly reminder_check + kpi_aggregation, daily boss_digest at 9am")
    return scheduler


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
