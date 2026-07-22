# Enterprise AI-Powered Lead Management Platform

Full implementation of the blueprint in this folder (Parts 1–10 + Appendix): Sales reps send WhatsApp
messages → Claude extracts structured leads → validation → duplicate detection → persisted to a
Databricks-style Lakehouse (Bronze/Silver/Gold) → AI enrichment → representative matching → WhatsApp
notifications + Quip sync → React dashboards.

Everything runs locally with no external accounts required. Databricks, WhatsApp Business, Quip, and
Claude are all stubbed with deterministic local fallbacks — flip a config value and each one switches
to the real service without touching application code.

## Stack

- **Backend**: FastAPI (Python), SQLAlchemy (SQLite locally, swappable for Databricks SQL), JWT + RBAC,
  APScheduler for the reminder/KPI jobs.
- **Frontend**: React + TypeScript + Tailwind CSS, React Router, TanStack Query, Zustand, Recharts.
- **AI**: 7 skill services (extraction, validation, duplicate detection, enrichment, representative
  matching, next-best-action, executive insights) — call Claude when `ANTHROPIC_API_KEY` is set,
  otherwise use deterministic heuristics so the whole pipeline runs for free, offline.

## Run it

**Backend** (http://localhost:8000):
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python seed_data.py          # creates demo users + representative roster
uvicorn app.main:app --reload --port 8000
```

**Frontend** (http://localhost:5173):
```bash
cd frontend
npm install
npm run dev
```

**Simulate WhatsApp messages** (with the backend running):
```bash
cd backend && source venv/bin/activate
python scripts/whatsapp_simulator.py          # sends 3 sample leads + a status update
python scripts/whatsapp_simulator.py --message "New Lead: Company: Acme Co Contact: Jane Doe Phone: +97455512345 Product: Cement Quantity: 50"
```

## Demo logins (from `seed_data.py`)

| Role | Email | Password |
|---|---|---|
| Administrator | admin@company.com | Admin@123 |
| Sales Manager | manager@company.com | Manager@123 |
| Sales Representative | rep@company.com | Rep@123 |
| Executive | exec@company.com | Exec@123 |
| Read-Only Auditor | auditor@company.com | Auditor@123 |

## What's mocked vs. real

Every integration reads its config from `backend/.env` (copy `backend/.env.example`). Empty = mocked.

| Integration | Mocked behavior | To go live |
|---|---|---|
| Claude AI | Deterministic regex/rule-based extraction, validation, scoring, matching (see `app/services/ai/*.py`) | Set `ANTHROPIC_API_KEY` |
| WhatsApp Business | Messages logged to console/`notifications` table instead of sent | Set `WHATSAPP_API_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` |
| Databricks | Local SQLite with the same Bronze/Silver/Gold table layout (`app/models/`) | Set `DATABRICKS_HOST` + `DATABRICKS_TOKEN`, point `DATABASE_URL` at the SQL warehouse |
| Quip | Snapshots written to `backend/quip_mock/<lead>.json` | Set `QUIP_API_TOKEN` |

## Where each blueprint part landed

- **Part 1 (Vision/Stack)** → overall architecture below.
- **Part 2 (Functional Design)** → `app/orchestrator/orchestrator.py` (12-step pipeline), `app/services/lead_service.py` (status lifecycle), `app/workers/reminder_worker.py` (24/48/72h engine).
- **Part 3 (Technical Architecture)** → `app/models/`, `app/api/` REST routes, `app/auth/`.
- **Part 4 (Frontend/Dashboards)** → `frontend/src/pages/*`.
- **Part 5 (Databricks/Data Engineering)** → `app/models/bronze.py` + `app/services/dashboard_service.py` (Gold aggregation), `app/db.py`.
- **Part 6 (Automation/Orchestration)** → `app/orchestrator/` (execution log, retry+backoff, Dead Letter Queue, event bus).
- **Part 7 (AI Prompt Library)** → `app/prompts/library.py` + `app/services/ai/*.py` + `app/models/ai_decision.py` (governance log).
- **Part 8 (DevOps)** → `.env.example`, `requirements.txt`; containerization/CI intentionally out of scope for a local build.
- **Part 9 (Security/Governance)** → `app/auth/` (JWT+RBAC, 5 roles), `app/services/audit_service.py` (immutable audit log).
- **Part 10 (Roadmap)** → informational; not code.
- **Appendix** → sample CSV/messages in `backend/seed_files/`, folder structures mirrored exactly.

## Project layout

```
backend/app/
  api/            REST routes (leads, representatives, dashboard, notifications, reminders, pipeline, admin, auth)
  services/       business logic + services/ai/ (the 7 AI skills)
  orchestrator/   pipeline orchestrator, event bus, retry/DLQ
  integrations/   whatsapp_client, quip_client, claude_client (mock-or-real switches)
  models/         SQLAlchemy tables (Bronze/Silver/Gold style)
  auth/           JWT + RBAC
  workers/        APScheduler jobs (reminders, KPI refresh)
  prompts/        AI prompt library text
frontend/src/
  pages/          Executive Landing, Lead Management, Sales Rep, Sales Manager, Marketing Analytics,
                  Notification Centre, Operations Dashboard, Administration
  api/            typed API client per backend router
  store/          Zustand auth store
```

## Verified end-to-end

The WhatsApp simulator was run against a live backend: message → Claude-style extraction → validation
→ duplicate detection (confirmed merges an exact-phone repeat message into the existing lead) →
Lead persisted → AI enrichment (industry/score/deal size) → representative auto-assigned by
territory/product/workload → WhatsApp notifications logged → Quip snapshot written → Gold dashboard
KPIs refreshed → invalid status transitions correctly rejected and logged. Full production build of
the frontend (`npm run build`) compiles clean.
