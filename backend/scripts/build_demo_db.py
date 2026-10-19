"""Build a self-contained demo database for the public (Vercel) deployment.

The deployed demo must never carry real customer data, so this script does not
copy the working `lakehouse.db`. It builds a fresh database from scratch:

    1. seed users, representatives and configuration (same as seed_data.py)
    2. ingest fictional WhatsApp messages through the real PipelineOrchestrator
       (extraction -> validation -> duplicate detection -> enrichment ->
       representative matching), so the demo data is genuinely pipeline-produced
    3. advance a subset of leads along valid status transitions
    4. backdate created_at so the trend charts have a time axis
    5. refresh the Gold dashboard metrics

Usage (from the backend directory, with the venv active):

    python scripts/build_demo_db.py --out ../api/seed/lakehouse.db
"""
from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Every fictional company, contact and phone number below is invented for the
# demo. Phone numbers use Qatar's +974 5xxxxxxx range held by the seed roster.
DEMO_MESSAGES: list[tuple[str, str]] = [
    ("+97450001111", "New Lead: Company: Al Fardan Construction Contact: Omar Al Fardan "
                     "Phone: +97455123456 Product: Cement Quantity: 450"),
    ("+97450001111", "New Lead: Company: Doha Grand Hotel Contact: Fatima Nasser "
                     "Phone: +97455234567 Email: fatima@dohagrand.example Product: Tissue Paper Quantity: 1200"),
    ("+97450002222", "New Lead: Company: Qatar Business Tower Contact: James Whitfield "
                     "Phone: +97455345678 Product: Office Furniture Quantity: 80"),
    ("+97450002222", "New Lead: Company: Al Rayyan Industries Contact: Hassan Ibrahim "
                     "Phone: +97455456789 Email: hassan@alrayyanind.example Product: Industrial Cleaning Chemicals Quantity: 45"),
    ("+97450003333", "New Lead: Company: Lusail Medical Centre Contact: Noura Al Mansouri "
                     "Phone: +97455567890 Product: Paper Hand Towels Quantity: 180"),
    ("+97450003333", "New Lead: Company: Msheireb Retail Group Contact: Yusuf Rahman "
                     "Phone: +97455678901 Email: yusuf@msheirebretail.example Product: Software License Quantity: 45"),
    ("+97450001111", "New Lead: Company: Al Khor Catering Services Contact: Mariam Al Sulaiti "
                     "Phone: +97455789012 Product: Basmati Rice Quantity: 5000"),
    ("+97450002222", "New Lead: Company: West Bay Towers FM Contact: Daniel Okafor "
                     "Phone: +97455890123 Email: daniel@westbayfm.example Product: Floor Cleaning Detergent Quantity: 40"),
    ("+97450003333", "New Lead: Company: Education City Facilities Contact: Aisha Darwish "
                     "Phone: +97455901234 Product: Office Chairs Quantity: 18"),
    ("+97450001111", "New Lead: Company: Doha Port Logistics Contact: Rashid Al Kuwari "
                     "Phone: +97455012345 Email: rashid@dohaportlog.example Product: Cement Quantity: 900"),
    ("+97450002222", "New Lead: Company: Souq Waqif Hospitality Contact: Layla Hassan "
                     "Phone: +97455112233 Product: Paper Napkins Quantity: 150"),
    ("+97450003333", "New Lead: Company: Barwa Real Estate Contact: Khalifa Al Thani "
                     "Phone: +97455223344 Email: khalifa@barwademo.example Product: Workstation Desks Quantity: 220"),
    ("+97450001111", "New Lead: Company: Hamad Industrial Supplies Contact: Ibrahim Saleh "
                     "Phone: +97455334455 Product: Industrial Detergent Quantity: 25"),
    ("+97450002222", "New Lead: Company: Qatar Airways Catering Contact: Sophie Lambert "
                     "Phone: +97455445566 Email: sophie@qacatering.example Product: Sunflower Cooking Oil Quantity: 6000"),
    # Deliberately incomplete: no product, no phone/email -> saved as a Draft.
    ("+97450003333", "New Lead: Company: Pearl Island Developments Contact: Ahmed Nasser"),
]

# Status journeys, applied by index into the ingested leads. Each step must be a
# legal transition in lead_service.STATUS_TRANSITIONS.
JOURNEYS: dict[int, list[str]] = {
    0: ["Contacted", "Qualified", "Quote Requested", "Quote Sent", "Negotiation", "Won"],
    1: ["Contacted", "Qualified", "Quote Requested", "Quote Sent", "Won"],
    2: ["Contacted", "Qualified", "Quote Requested", "Quote Sent"],
    3: ["Contacted", "Qualified", "Quote Requested"],
    4: ["Contacted", "Qualified"],
    5: ["Contacted", "Qualified", "Quote Requested", "Quote Sent", "Negotiation"],
    6: ["Contacted", "Lost"],
    7: ["Contacted", "Qualified", "Quote Requested", "Quote Sent", "Lost"],
    8: ["Contacted"],
    9: ["Contacted", "Qualified", "Quote Requested", "Quote Sent", "Won"],
    10: ["Contacted", "Qualified"],
    11: ["Contacted", "Qualified", "Quote Requested", "Quote Sent", "Negotiation", "Won"],
    12: ["Contacted", "Lost"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, help="path to write the demo database to")
    parser.add_argument("--seed", type=int, default=20261020, help="RNG seed for reproducible backdating")
    return parser.parse_args()


def prepare_database_path(out_path: Path) -> None:
    """Point the app at a fresh database file. Must run before importing app modules."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        out_path.unlink()
    os.environ["DATABASE_URL"] = f"sqlite:///{out_path}"
    # Force every integration into its mocked mode so the build never touches
    # a real API, even if the developer's shell has credentials exported.
    for key in ("ANTHROPIC_API_KEY", "WASENDER_API_KEY", "WASENDER_WEBHOOK_SECRET", "QUIP_API_TOKEN"):
        os.environ[key] = ""
    os.environ["SAP_MODE"] = "off"
    os.environ["ENABLE_SCHEDULER"] = "false"


def seed_reference_data() -> None:
    import seed_data

    seed_data.main()


def ingest_leads() -> list[str]:
    """Run every demo message through the real pipeline. Returns lead ids in order."""
    from app.db import SessionLocal
    from app.models.lead import Lead
    from app.orchestrator.orchestrator import PipelineOrchestrator

    lead_ids: list[str] = []
    db = SessionLocal()
    try:
        orchestrator = PipelineOrchestrator(db)
        for sender, message in DEMO_MESSAGES:
            orchestrator.run_lead_ingestion(message, sender, actor="demo-build")
        for lead in db.query(Lead).order_by(Lead.lead_number).all():
            lead_ids.append(lead.id)
    finally:
        db.close()
    return lead_ids


def advance_statuses(lead_ids: list[str]) -> None:
    from app.db import SessionLocal
    from app.models.lead import Lead
    from app.services import lead_service

    db = SessionLocal()
    try:
        for index, steps in JOURNEYS.items():
            if index >= len(lead_ids):
                continue
            lead = db.query(Lead).filter(Lead.id == lead_ids[index]).first()
            if lead is None:
                continue
            for status in steps:
                if not lead_service.change_status(db, lead, status, actor="demo-build"):
                    break
    finally:
        db.close()


def backdate(lead_ids: list[str], rng: random.Random) -> None:
    """Spread the demo over the last ~60 days so the charts have a real time axis.

    The whole timeline moves together. Every status change and activity row is
    rewritten to sit after its lead's new created_at, because the dashboard's
    "average response time" is first-status-change minus created_at — leaving the
    history at build time would report weeks instead of hours.
    """
    from app.db import SessionLocal
    from app.models.activity import LeadActivity, LeadStatusHistory
    from app.models.lead import Lead

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db = SessionLocal()
    try:
        for position, lead_id in enumerate(lead_ids):
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if lead is None:
                continue

            # Oldest first, with jitter, so the newest leads sit near today.
            days_back = int(58 - (position / max(len(lead_ids) - 1, 1)) * 55) + rng.randint(-2, 2)
            created = now - timedelta(days=max(days_back, 1), hours=rng.randint(0, 23))
            lead.created_at = created
            lead.updated_at = created

            # First human response within a working day or two, then the deal
            # advances every few days.
            cursor = created + timedelta(hours=rng.randint(2, 20))
            for row in (
                db.query(LeadStatusHistory)
                .filter(LeadStatusHistory.lead_id == lead_id)
                .order_by(LeadStatusHistory.created_at)
                .all()
            ):
                # The row the pipeline writes when the lead is created belongs at
                # creation time. Response time is measured from the first row
                # after it, so only those advance the cursor.
                if row.to_status == "New":
                    row.created_at = created
                    continue
                row.created_at = min(cursor, now)
                cursor += timedelta(days=rng.randint(1, 5), hours=rng.randint(0, 12))

            for row in (
                db.query(LeadActivity)
                .filter(LeadActivity.lead_id == lead_id)
                .order_by(LeadActivity.created_at)
                .all()
            ):
                row.created_at = min(created + timedelta(hours=rng.randint(1, 36)), now)

            last_touch = min(cursor, now)
            lead.updated_at = last_touch
            lead.last_activity_at = last_touch.replace(tzinfo=timezone.utc).isoformat()
        db.commit()
    finally:
        db.close()


def refresh_metrics() -> None:
    from app.db import SessionLocal
    from app.services import dashboard_service

    db = SessionLocal()
    try:
        dashboard_service.refresh_gold_metrics(db)
    finally:
        db.close()


def summarise(out_path: Path) -> None:
    import sqlite3

    conn = sqlite3.connect(out_path)
    try:
        leads = conn.execute("select status, count(*) from leads group by status order by 2 desc").fetchall()
        users = conn.execute("select count(*) from users").fetchone()[0]
        reps = conn.execute("select count(*) from representatives").fetchone()[0]
        total = conn.execute("select count(*) from leads").fetchone()[0]
    finally:
        conn.close()

    print(f"\nDemo database written to {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")
    print(f"  users: {users}   representatives: {reps}   leads: {total}")
    for status, count in leads:
        print(f"    {status:<18} {count}")


def main() -> None:
    args = parse_args()
    out_path = Path(args.out).resolve()
    prepare_database_path(out_path)

    seed_reference_data()
    lead_ids = ingest_leads()
    advance_statuses(lead_ids)
    backdate(lead_ids, random.Random(args.seed))
    refresh_metrics()
    summarise(out_path)


if __name__ == "__main__":
    main()
