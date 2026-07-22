from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, get_current_user, insight_roles, managers_and_admin
from app.db import get_db
from app.models.pipeline import DeadLetterEntry, PipelineExecution
from app.schemas.lead import LeadOut
from app.services import dashboard_service
from app.services.ai.executive_insights import generate_executive_insights
from app.services.dashboard_service import get_kpi_snapshot, refresh_gold_metrics

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _scoped_rep_id(current: CurrentUser, requested: str | None) -> str | None:
    """Sales reps can only ever see their own data, regardless of what the client asks for."""
    if current.role == "sales_representative":
        return current.representative_id or "__none__"
    return requested


def _serialize_leads(leads) -> list[dict]:
    return [LeadOut.model_validate(lead).model_dump(mode="json") for lead in leads]


@router.get("")
def get_dashboard(db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    if current.role == "sales_representative":
        # Reps only ever see their own numbers — no org-wide rep breakdown or cross-rep aggregates.
        overview = dashboard_service.get_overview_stats(db, current.representative_id or "__none__")
        return {
            "kpis": {
                "total_leads": overview["total_leads"],
                "active_leads": overview["active_leads"],
                "won_leads": overview["won_leads"],
                "lost_leads": overview["lost_leads"],
                "pipeline_value": overview["pipeline_value"],
                "sla_breaches": 0,
                "pending_followups": 0,
            },
            "leads_by_status": overview["leads_by_status"],
            "leads_by_representative": {},
            "leads_by_product_category": overview["leads_by_product_category"],
            "top_representative": None,
        }

    refresh_gold_metrics(db)
    snapshot = get_kpi_snapshot(db)

    top_rep = None
    if snapshot.get("leads_by_representative"):
        top_rep = max(snapshot["leads_by_representative"].items(), key=lambda kv: kv[1])[0]

    return {
        "kpis": {
            "total_leads": snapshot.get("total_leads", {}).get("all", 0),
            "active_leads": snapshot.get("active_leads", {}).get("all", 0),
            "won_leads": snapshot.get("won_leads", {}).get("all", 0),
            "lost_leads": snapshot.get("lost_leads", {}).get("all", 0),
            "pipeline_value": snapshot.get("pipeline_value", {}).get("all", 0),
            "sla_breaches": snapshot.get("sla_breaches", {}).get("all", 0),
            "pending_followups": snapshot.get("pending_followups", {}).get("all", 0),
        },
        "leads_by_status": snapshot.get("leads_by_status", {}),
        "leads_by_representative": snapshot.get("leads_by_representative", {}),
        "leads_by_product_category": snapshot.get("leads_by_product_category", {}),
        "top_representative": top_rep,
    }


@router.get("/executive-insights")
def executive_insights(db: Session = Depends(get_db), current: CurrentUser = Depends(insight_roles)):
    refresh_gold_metrics(db)
    snapshot = get_kpi_snapshot(db)
    top_rep = None
    if snapshot.get("leads_by_representative"):
        top_rep = max(snapshot["leads_by_representative"].items(), key=lambda kv: kv[1])[0]

    stats = {
        "total_leads": snapshot.get("total_leads", {}).get("all", 0),
        "won": snapshot.get("won_leads", {}).get("all", 0),
        "lost": snapshot.get("lost_leads", {}).get("all", 0),
        "sla_breaches": snapshot.get("sla_breaches", {}).get("all", 0),
        "pipeline_value": snapshot.get("pipeline_value", {}).get("all", 0),
        "top_representative": top_rep or "N/A",
    }
    return generate_executive_insights(db, stats)


@router.get("/operations")
def operations_dashboard(db: Session = Depends(get_db), current: CurrentUser = Depends(insight_roles)):
    """Pipeline Monitoring / Operations Dashboard — Blueprint Part 6."""
    total_runs = db.query(func.count(PipelineExecution.id)).scalar() or 0
    success = db.query(func.count(PipelineExecution.id)).filter(PipelineExecution.status == "success").scalar() or 0
    failed = db.query(func.count(PipelineExecution.id)).filter(PipelineExecution.status == "dead_letter").scalar() or 0
    running = db.query(func.count(PipelineExecution.id)).filter(PipelineExecution.status == "running").scalar() or 0
    dlq_unresolved = db.query(func.count(DeadLetterEntry.id)).filter(DeadLetterEntry.resolved == False).scalar() or 0  # noqa: E712

    recent = (
        db.query(PipelineExecution)
        .order_by(PipelineExecution.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "workflow_success_rate": round((success / total_runs) * 100, 1) if total_runs else 100.0,
        "total_executions": total_runs,
        "successful": success,
        "failed": failed,
        "running": running,
        "dead_letter_queue_length": dlq_unresolved,
        "recent_executions": [
            {
                "id": e.id,
                "workflow_name": e.workflow_name,
                "lead_id": e.lead_id,
                "status": e.status,
                "current_stage": e.current_stage,
                "retry_count": e.retry_count,
                "started_at": e.started_at,
                "ended_at": e.ended_at,
            }
            for e in recent
        ],
    }


# --- TFS Dashboard tabs (Overview / Engagement / Won / Lost) -----------------
# Each accepts an optional representative_id filter for the tab's sales-rep dropdown.
# Sales representatives are always scoped to their own data server-side.


@router.get("/tabs/overview")
def tab_overview(
    representative_id: str | None = None,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
):
    return dashboard_service.get_overview_stats(db, _scoped_rep_id(current, representative_id))


@router.get("/tabs/engagement")
def tab_engagement(
    representative_id: str | None = None,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
):
    result = dashboard_service.get_engagement_stats(db, _scoped_rep_id(current, representative_id))
    return {**result, "leads": _serialize_leads(result["leads"])}


@router.get("/tabs/won")
def tab_won(
    representative_id: str | None = None,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
):
    result = dashboard_service.get_won_stats(db, _scoped_rep_id(current, representative_id))
    return {**result, "leads": _serialize_leads(result["leads"])}


@router.get("/tabs/lost")
def tab_lost(
    representative_id: str | None = None,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
):
    result = dashboard_service.get_lost_stats(db, _scoped_rep_id(current, representative_id))
    return {**result, "leads": _serialize_leads(result["leads"])}


@router.get("/tabs/unassigned")
def tab_unassigned(db: Session = Depends(get_db), current: CurrentUser = Depends(managers_and_admin)):
    """Manager/admin-only — an unassigned lead has no rep to scope by, and reps have no
    action to take on a lead that isn't theirs yet."""
    result = dashboard_service.get_unassigned_stats(db)
    return {**result, "leads": _serialize_leads(result["leads"])}
