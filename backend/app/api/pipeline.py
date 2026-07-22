from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, admin_only, insight_roles
from app.db import get_db
from app.models.pipeline import DeadLetterEntry, PipelineEvent, PipelineExecution
from app.orchestrator.orchestrator import PipelineOrchestrator

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.get("/executions/{execution_id}")
def get_execution(execution_id: str, db: Session = Depends(get_db), current: CurrentUser = Depends(insight_roles)):
    execution = db.get(PipelineExecution, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    events = db.query(PipelineEvent).filter(PipelineEvent.execution_id == execution_id).order_by(PipelineEvent.created_at).all()
    return {
        "execution": {
            "id": execution.id,
            "workflow_name": execution.workflow_name,
            "status": execution.status,
            "current_stage": execution.current_stage,
            "retry_count": execution.retry_count,
            "error_details": execution.error_details,
        },
        "events": [{"type": e.event_type, "stage": e.stage, "success": e.success, "created_at": e.created_at} for e in events],
    }


@router.get("/dead-letter-queue")
def list_dlq(db: Session = Depends(get_db), current: CurrentUser = Depends(insight_roles)):
    entries = db.query(DeadLetterEntry).filter(DeadLetterEntry.resolved == False).order_by(DeadLetterEntry.created_at.desc()).all()  # noqa: E712
    return [
        {
            "id": e.id, "execution_id": e.execution_id, "workflow_name": e.workflow_name,
            "stage": e.stage, "error_details": e.error_details, "created_at": e.created_at,
        }
        for e in entries
    ]


@router.post("/dead-letter-queue/{entry_id}/replay")
def replay_dlq_entry(entry_id: str, db: Session = Depends(get_db), current: CurrentUser = Depends(admin_only)):
    """Manual replay per Blueprint Part 6 Retry & Recovery."""
    import json

    entry = db.get(DeadLetterEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Dead letter entry not found")

    payload = json.loads(entry.payload)
    orchestrator = PipelineOrchestrator(db)
    execution = orchestrator.run_lead_ingestion(
        payload.get("raw_message", ""), payload.get("sender_phone", ""), actor=f"replay:{current.email}"
    )

    if execution.status == "success":
        entry.resolved = True
        db.commit()

    return {"new_execution_id": execution.id, "status": execution.status}
