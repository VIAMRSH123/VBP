from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, insight_roles
from app.db import get_db
from app.models.lead import Lead

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/sales-funnel")
def sales_funnel(db: Session = Depends(get_db), current: CurrentUser = Depends(insight_roles)):
    rows = db.query(Lead.status, func.count(Lead.id)).filter(Lead.active_flag == True).group_by(Lead.status).all()  # noqa: E712
    return {status: count for status, count in rows}


@router.get("/regional-distribution")
def regional_distribution(db: Session = Depends(get_db), current: CurrentUser = Depends(insight_roles)):
    rows = (
        db.query(Lead.territory, func.count(Lead.id))
        .filter(Lead.territory != "")
        .group_by(Lead.territory)
        .all()
    )
    return {territory: count for territory, count in rows}


@router.get("/rep-performance")
def rep_performance(
    representative_id: str | None = None,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(insight_roles),
):
    query = db.query(
        Lead.representative_id,
        Lead.representative_name,
        func.count(Lead.id),
        func.sum(Lead.deal_size_estimate),
    ).filter(Lead.representative_name != "")
    if representative_id:
        query = query.filter(Lead.representative_id == representative_id)

    rows = query.group_by(Lead.representative_id, Lead.representative_name).all()

    won_counts = dict(
        db.query(Lead.representative_id, func.count(Lead.id))
        .filter(Lead.status == "Won", Lead.representative_name != "")
        .group_by(Lead.representative_id)
        .all()
    )

    return [
        {
            "representative_id": rep_id,
            "representative": name,
            "lead_count": count,
            "pipeline_value": value or 0,
            "won_count": won_counts.get(rep_id, 0),
        }
        for rep_id, name, count, value in rows
    ]
