"""Gold-layer KPI aggregation — Blueprint Part 5 / Part 6 Scheduler."""
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.activity import LeadStatusHistory
from app.models.dashboard import DashboardMetric
from app.models.lead import Lead
from app.models.notification import ReminderQueue

TERMINAL_STATUSES = ("Won", "Lost", "Archived")
ENGAGED_STATUSES = (
    "Assigned",
    "Contacted",
    "Qualified",
    "Quote Requested",
    "Quote Sent",
    "Negotiation",
    "Awaiting Customer",
)


def _upsert_metric(db: Session, metric_key: str, dimension: str, value: float, period: str = "all_time") -> None:
    existing = (
        db.query(DashboardMetric)
        .filter(
            DashboardMetric.metric_key == metric_key,
            DashboardMetric.dimension == dimension,
            DashboardMetric.period == period,
        )
        .first()
    )
    if existing:
        existing.metric_value = value
        existing.updated_at = datetime.now(timezone.utc)
    else:
        db.add(DashboardMetric(metric_key=metric_key, dimension=dimension, metric_value=value, period=period))


def refresh_gold_metrics(db: Session) -> dict:
    """Recompute Gold-layer aggregates from Silver lead data. Idempotent — safe to call often."""
    total = db.query(func.count(Lead.id)).filter(Lead.active_flag == True).scalar() or 0  # noqa: E712
    won = db.query(func.count(Lead.id)).filter(Lead.status == "Won").scalar() or 0
    lost = db.query(func.count(Lead.id)).filter(Lead.status == "Lost").scalar() or 0
    active = db.query(func.count(Lead.id)).filter(Lead.status.notin_(TERMINAL_STATUSES)).scalar() or 0
    pipeline_value = (
        db.query(func.coalesce(func.sum(Lead.deal_size_estimate), 0.0))
        .filter(Lead.status.notin_(TERMINAL_STATUSES))
        .scalar()
        or 0.0
    )
    sla_breaches = db.query(func.count(ReminderQueue.id)).filter(ReminderQueue.stage >= 3, ReminderQueue.processed == False).scalar() or 0  # noqa: E712
    pending_followups = db.query(func.count(ReminderQueue.id)).filter(ReminderQueue.processed == False).scalar() or 0  # noqa: E712

    _upsert_metric(db, "total_leads", "all", total)
    _upsert_metric(db, "active_leads", "all", active)
    _upsert_metric(db, "won_leads", "all", won)
    _upsert_metric(db, "lost_leads", "all", lost)
    _upsert_metric(db, "pipeline_value", "all", pipeline_value)
    _upsert_metric(db, "sla_breaches", "all", sla_breaches)
    _upsert_metric(db, "pending_followups", "all", pending_followups)

    by_status = db.query(Lead.status, func.count(Lead.id)).filter(Lead.active_flag == True).group_by(Lead.status).all()  # noqa: E712
    for status, count in by_status:
        _upsert_metric(db, "leads_by_status", status, count)

    by_rep = (
        db.query(Lead.representative_name, func.count(Lead.id))
        .filter(Lead.representative_name != "")
        .group_by(Lead.representative_name)
        .all()
    )
    for rep_name, count in by_rep:
        _upsert_metric(db, "leads_by_representative", rep_name, count)

    by_product = (
        db.query(Lead.product_category, func.count(Lead.id))
        .filter(Lead.product_category != "")
        .group_by(Lead.product_category)
        .all()
    )
    for category, count in by_product:
        _upsert_metric(db, "leads_by_product_category", category, count)

    db.commit()

    return {
        "total_leads": total,
        "active_leads": active,
        "won": won,
        "lost": lost,
        "pipeline_value": pipeline_value,
        "sla_breaches": sla_breaches,
        "pending_followups": pending_followups,
    }


def get_kpi_snapshot(db: Session) -> dict:
    metrics = db.query(DashboardMetric).all()
    snapshot: dict = {}
    for m in metrics:
        snapshot.setdefault(m.metric_key, {})
        snapshot[m.metric_key][m.dimension] = m.metric_value
    return snapshot


# --- Rep-scoped tab views (TFS Dashboard) -----------------------------------
# These query Lead directly rather than the cached Gold snapshot above, since
# they need to respond in real time to an optional representative_id filter.


def _lead_query(db: Session, representative_id: str | None = None):
    query = db.query(Lead).filter(Lead.active_flag == True)  # noqa: E712
    if representative_id:
        query = query.filter(Lead.representative_id == representative_id)
    return query


def get_overview_stats(db: Session, representative_id: str | None = None) -> dict:
    base = _lead_query(db, representative_id)
    total = base.count()
    active = base.filter(Lead.status.notin_(TERMINAL_STATUSES)).count()
    won = base.filter(Lead.status == "Won").count()
    lost = base.filter(Lead.status == "Lost").count()
    pipeline_value = (
        _lead_query(db, representative_id)
        .filter(Lead.status.notin_(TERMINAL_STATUSES))
        .with_entities(func.coalesce(func.sum(Lead.deal_size_estimate), 0.0))
        .scalar()
        or 0.0
    )

    by_status = dict(
        _lead_query(db, representative_id).with_entities(Lead.status, func.count(Lead.id)).group_by(Lead.status).all()
    )
    by_product = dict(
        _lead_query(db, representative_id)
        .filter(Lead.product_category != "")
        .with_entities(Lead.product_category, func.count(Lead.id))
        .group_by(Lead.product_category)
        .all()
    )

    return {
        "total_leads": total,
        "active_leads": active,
        "won_leads": won,
        "lost_leads": lost,
        "pipeline_value": pipeline_value,
        "leads_by_status": by_status,
        "leads_by_product_category": by_product,
    }


def _avg_response_time_hours(db: Session, representative_id: str | None = None) -> float:
    """Average hours between lead creation and the first status change away from 'New'."""
    query = (
        db.query(Lead.id, Lead.created_at, func.min(LeadStatusHistory.created_at).label("first_engaged_at"))
        .join(LeadStatusHistory, LeadStatusHistory.lead_id == Lead.id)
        .filter(LeadStatusHistory.to_status != "New")
        .filter(Lead.active_flag == True)  # noqa: E712
    )
    if representative_id:
        query = query.filter(Lead.representative_id == representative_id)
    rows = query.group_by(Lead.id, Lead.created_at).all()

    if not rows:
        return 0.0

    total_hours = sum(max((first_engaged_at - created_at).total_seconds() / 3600, 0) for _, created_at, first_engaged_at in rows)
    return round(total_hours / len(rows), 1)


def get_engagement_stats(db: Session, representative_id: str | None = None) -> dict:
    leads = (
        _lead_query(db, representative_id)
        .filter(Lead.status.in_(ENGAGED_STATUSES))
        .order_by(Lead.updated_at.desc())
        .limit(100)
        .all()
    )
    total_engaged = (
        _lead_query(db, representative_id).filter(Lead.status.in_(ENGAGED_STATUSES)).count()
    )
    return {
        "total_engaged": total_engaged,
        "avg_response_time_hours": _avg_response_time_hours(db, representative_id),
        "leads": leads,
    }


def get_won_stats(db: Session, representative_id: str | None = None) -> dict:
    leads = _lead_query(db, representative_id).filter(Lead.status == "Won").order_by(Lead.updated_at.desc()).all()
    total_value = sum(lead.deal_size_estimate for lead in leads)
    return {"count": len(leads), "total_value": total_value, "leads": leads}


def get_lost_stats(db: Session, representative_id: str | None = None) -> dict:
    leads = _lead_query(db, representative_id).filter(Lead.status == "Lost").order_by(Lead.updated_at.desc()).all()
    lost_value = sum(lead.deal_size_estimate for lead in leads)
    return {"count": len(leads), "lost_value": lost_value, "leads": leads}


def get_unassigned_stats(db: Session) -> dict:
    """Leads still at status 'New' — no confident representative match was found for these
    (see orchestrator's UnassignedQueue routing). Not rep-scoped: by definition these leads have
    no representative_id, so there's nothing to filter by."""
    leads = _lead_query(db).filter(Lead.status == "New").order_by(Lead.created_at.desc()).limit(100).all()
    total_unassigned = _lead_query(db).filter(Lead.status == "New").count()
    return {"total_unassigned": total_unassigned, "leads": leads}
