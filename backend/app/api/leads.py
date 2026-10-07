from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, get_current_user, write_roles
from app.db import get_db
from app.models.activity import LeadActivity, LeadStatusHistory
from app.models.lead import Lead
from app.schemas.lead import LeadListResponse, LeadOut, LeadStatusUpdate, NextBestActionOut
from app.services import dashboard_service, lead_service
from app.services.ai.next_best_action import recommend_next_action
from app.services.audit_service import record_audit
from app.integrations import quip_client
from datetime import datetime
import json

router = APIRouter(prefix="/api/leads", tags=["leads"])


def _ensure_owned_lead(lead: Lead, current: CurrentUser) -> None:
    """Sales reps may only access their own leads — 404 (not 403) to avoid confirming existence."""
    if current.role == "sales_representative" and lead.representative_id != current.representative_id:
        raise HTTPException(status_code=404, detail="Lead not found")


@router.get("", response_model=LeadListResponse)
def list_leads(
    status: str | None = None,
    representative_id: str | None = None,
    search: str | None = None,
    source: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user),
):
    query = db.query(Lead).filter(Lead.active_flag == True)  # noqa: E712

    if current.role == "sales_representative" and current.representative_id:
        query = query.filter(Lead.representative_id == current.representative_id)

    if status:
        query = query.filter(Lead.status == status)
    if representative_id:
        query = query.filter(Lead.representative_id == representative_id)
    if source:
        query = query.filter(Lead.source == source)
    if search:
        like = f"%{search}%"
        query = query.filter((Lead.company.like(like)) | (Lead.contact_name.like(like)) | (Lead.lead_number.like(like)))

    total = query.count()
    items = query.order_by(Lead.created_at.desc()).offset(offset).limit(limit).all()
    return LeadListResponse(total=total, items=items)


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: str, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _ensure_owned_lead(lead, current)
    return lead


@router.get("/{lead_id}/sap")
def get_lead_sap_references(lead_id: str, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    """SAP document numbers, stage and sync time for a lead that came from SAP (empty for others)."""
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _ensure_owned_lead(lead, current)
    try:
        refs = json.loads(lead.sap_refs) if lead.sap_refs else {}
    except ValueError:
        refs = {}
    return {
        "linked": bool(lead.external_id),
        "external_system": lead.external_system,
        "external_id": lead.external_id,
        "card_code": lead.sap_card_code,
        "synced_at": lead.sap_synced_at,
        "refs": refs,
    }


@router.get("/{lead_id}/activity")
def get_lead_activity(lead_id: str, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _ensure_owned_lead(lead, current)

    activities = db.query(LeadActivity).filter(LeadActivity.lead_id == lead_id).order_by(LeadActivity.created_at.desc()).all()
    history = db.query(LeadStatusHistory).filter(LeadStatusHistory.lead_id == lead_id).order_by(LeadStatusHistory.created_at).all()
    return {
        "activities": [
            {"id": a.id, "type": a.activity_type, "description": a.description, "actor": a.actor, "created_at": a.created_at}
            for a in activities
        ],
        "status_history": [
            {"from": h.from_status, "to": h.to_status, "changed_by": h.changed_by, "remarks": h.remarks, "created_at": h.created_at}
            for h in history
        ],
    }


@router.put("/{lead_id}/status")
def update_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(write_roles),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _ensure_owned_lead(lead, current)

    ok = lead_service.change_status(db, lead, payload.status, actor=current.email, remarks=payload.remarks)
    if not ok:
        raise HTTPException(
            status_code=400, detail=f"Invalid transition from '{lead.status}' to '{payload.status}'"
        )

    quip_client.sync_lead(lead.lead_number, {"status": lead.status, "remarks": payload.remarks})
    dashboard_service.refresh_gold_metrics(db)
    record_audit(
        db, actor=current.email, actor_role=current.role, action="lead.status_update",
        entity_type="lead", entity_id=lead.id, details=f"{lead.status} - {payload.remarks}",
    )
    return {"id": lead.id, "status": lead.status}


@router.get("/{lead_id}/next-best-action", response_model=NextBestActionOut)
def next_best_action(lead_id: str, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _ensure_owned_lead(lead, current)

    last_activity = None
    if lead.last_activity_at:
        try:
            last_activity = datetime.fromisoformat(lead.last_activity_at)
        except ValueError:
            last_activity = None

    result = recommend_next_action(db, lead.status, last_activity, lead.risk_score, lead_id=lead.id)
    return NextBestActionOut(**result)
