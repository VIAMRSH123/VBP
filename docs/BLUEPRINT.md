# Blueprint Reference (consolidated from Parts 1–10 + Appendix)

Source docs: `Enterprise_Lead_Management_Master_Blueprint_Part1-10.{docx,pdf}` + `Appendix.pdf` in the
project root. This file is a condensed reference so future sessions don't need to re-parse them.

## Vision
End-to-end AI-powered sales ops platform: Sales Reps only send WhatsApp messages; everything else is
automated. Flow: Sales Rep → WhatsApp Business → Automation Layer (Meta API/n8n/Composio) → Claude AI →
Validation → Duplicate Detection → Databricks Lakehouse (system of record) → Lead Enrichment → CSV Rep
Matching → Notification Engine → Quip Sync → React Dashboard.

## Stack (as specified)
React+TS+Tailwind frontend · FastAPI backend · Databricks Lakehouse/Delta Lake/Databricks SQL ·
n8n/Composio automation · JWT+RBAC · WhatsApp Business API notifications · future: MLflow, Unity
Catalog, Spark.

## Functional phases (Part 2)
1. **WhatsApp Ingestion**: extract fields, validate, dedupe, create Lead ID, persist, log activity/status
   history, sync Quip, refresh dashboard, trigger enrichment. Mandatory fields: Company, Contact,
   Product, Sales Rep, Phone-or-Email. Checks: phone/email format, quantity>0, product exists, dup
   company/phone/active lead. Incomplete records still create as Draft.
2. **AI Lead Enrichment**: industry, customer type, product category, territory, lead score (0-100),
   deal size estimate, buying probability, existing-customer flag, priority score, risk score +
   confidence metadata.
3. **Representative Matching**: admin uploads CSV (Representative, Territory, Products, Languages,
   Manager, Workload, Availability) → validate → load → lookup table → match → confidence score →
   assign → notify → log. No match → Unassigned Queue + notify Sales Manager.
4. **Lead Status Engine**: New → Assigned → Contacted → Qualified → Quote Requested → Quote Sent →
   Negotiation → Awaiting Customer → Won/Lost → Archived. Each state has entry/exit criteria, owner,
   SLA, allowed transitions.
5. **Reminder & Escalation**: 24h → WhatsApp reminder to rep+manager. 48h → second reminder. 72h →
   escalate to Sales Ops/Admin. All logged to Activity Log, Notification History, Lead Timeline,
   Dashboard alerts.
6. **Notification templates**: LeadAssigned, LeadUpdated, FollowUpDue, NeedsAttention, SLABreach, Won,
   Lost, DailySummary, WeeklySummary.

## Data platform (Parts 3 & 5)
Medallion architecture — Bronze (raw WhatsApp payloads, CSV uploads, raw events), Silver (validated
leads, standardized products/customers, rep mappings), Gold (executive/sales/marketing KPIs, SLA
metrics, dashboard aggregates). Databricks is the single source of truth; Quip is a collaboration
layer only; the dashboard reads via backend APIs, never raw tables.

Core Delta tables: `leads, customers, representatives, managers, products, lead_activity,
lead_status_history, notifications, reminder_queue, audit_log, representative_mapping,
configuration, dashboard_kpis`. Common columns: `created_at, updated_at, created_by, modified_by,
active_flag`.

Unity Catalog: separate `dev/test/prod` catalogs; schemas `bronze/silver/gold/reference/analytics`.
Performance: Delta optimize, partition by date, Auto Optimize/Compaction, Z-Order on Lead ID/Status/
Rep/Company.

REST API surface (Appendix E): `POST /api/leads`, `PUT /api/leads/{id}`, `PUT /api/leads/{id}/status`,
`GET /api/leads`, `GET /api/dashboard`, `GET /api/activities`, `POST
/api/representatives/upload-csv`, `GET /api/notifications`, `POST /api/reminders/run`, `GET
/api/reports`.

Backend module layout: `authentication, leads, enrichment, representative_matching, notifications,
dashboard, reporting, integrations, databricks_client, audit, shared`.

## Frontend (Part 4)
React+TS, Tailwind, React Router, React Query, Zustand/Redux Toolkit, ECharts/Recharts, JWT auth,
responsive, dark/light theme. Pages: Executive Landing (KPIs: total/active/won-lost leads, pipeline
value, forecast revenue, SLA breaches, pending follow-ups; charts: funnel, monthly trends, product
demand, regional distribution, AI insights), Lead Management (search/filter/table/timeline/AI
summary/status/export/SLA countdown), Sales Representative (assigned/overdue/follow-ups/conversion/
response time/revenue), Sales Manager (team performance/workload/escalations/leaderboard/pipeline/SLA/
revenue by rep), Marketing (sources/demand/segments/industry/trends/repeat customers), Notification
Center, Administration (CSV upload, assignment rules, reminder settings, AI prompts, user mgmt, role
permissions).

Folder structure: `src/{components,pages,layouts,services,api,hooks,store,types,utils,assets,styles}`.

## Automation & Orchestration (Part 6)
Pipeline Orchestrator = central workflow engine: receives events, coordinates services, sequential+
parallel tasks, execution state, retries, audit logs, idempotency, manual replay, execution metrics.
Flow: receive event → execution ID → store raw payload → Claude extraction → validate → dup detection
→ persist Databricks → enrich → match rep → sync Quip → refresh dashboard → notify → audit trail.
Retry: transient failures up to 3x exponential backoff → Dead Letter Queue on exhaustion, manual
replay supported. Standard events: `LeadCreated, LeadUpdated, LeadAssigned, LeadEnriched,
ReminderTriggered, ReminderEscalated, DashboardRefreshed, NotificationSent, CSVUploaded,
PipelineFailed`. Scheduler: hourly reminder checks, daily KPI aggregation, dashboard refresh, CSV sync,
weekly summaries, monthly analytics, housekeeping. Operations Dashboard: pipeline health, workflow
success rate, queue lengths, processing times, SLA compliance, integration health, AI metrics, alerts.

## AI Layer (Part 7)
Modular services: Lead Extraction, Validation Assistant, Duplicate Detection Assistant, Lead
Enrichment, AI Decision Engine, Executive Insights Generator, Conversational Analytics. Each prompt
returns JSON with confidence scores. Governance: log every AI decision + prompt version + model
version + confidence + human override; support prompt versioning, eval metrics, feedback loops.

## DevOps (Part 8)
Separate scalable components behind API gateway/load balancer; Dev/QA/Staging/Prod envs; Docker +
Kubernetes; Git-based CI/CD (lint, unit/integration tests, security scan, build, approval, staging,
rollout); IaC; centralized logging/monitoring/alerting; backup/DR with RPO/RTO; horizontal scaling,
async processing, queues, caching, rate limiting.

## Security & Governance (Part 9)
SSO where possible + JWT + MFA for privileged users. RBAC roles: **Administrator, Sales Manager, Sales
Representative, Executive, Read-Only Auditor** — least privilege. API security: HTTPS, JWT validation,
rate limiting, request validation, versioning, audit logging. Data protection: TLS in transit,
encryption at rest, PII masking. Secrets manager for all credentials — never hardcoded. Databricks:
Unity Catalog governance, separate dev/test/prod catalogs, fine-grained permissions. Immutable audit
logs for logins, lead updates, AI decisions, assignments, reminders, CSV uploads, admin actions.
Security monitoring + automated alerts. Business continuity: incident response, DR, backup validation,
access reviews, vulnerability scans before every release.

## Roadmap (Part 10)
Sprints: 1 Requirements/Architecture, 2 Databricks foundation, 3 WhatsApp integration, 4 AI extraction/
validation, 5 Enrichment/matching, 6 Dashboards, 7 Notifications/reminders, 8 Testing/hardening, 9 UAT,
10 Production. Risk register: API availability, data quality, prompt drift, CSV inconsistencies,
notification failures, scaling. Future: ERP/CRM integration, AI Copilot, predictive scoring, quotation
generation, forecasting, OCR, voice transcription, multilingual, mobile app, customer portal.

## Appendix — reference assets
- Sample rep CSV columns: `RepresentativeID, RepresentativeName, Territory, Region, ProductCategory,
  Language, Manager, ManagerPhone, Email, Workload, ActiveFlag` (we added `Phone` too — see
  `backend/seed_files/representatives.csv`).
- Sample WhatsApp messages: `Company: ABC Trading Contact: Ahmed Ali Phone: +974... Product: Tissue
  Paper Quantity: 300` and `LeadID: L-10025 Status: Quote Sent Remarks: Follow-up Friday.`
- Env vars: `WHATSAPP_API_TOKEN, WHATSAPP_WEBHOOK_SECRET, DATABRICKS_HOST, DATABRICKS_TOKEN,
  DATABRICKS_SQL_WAREHOUSE, QUIP_API_TOKEN, JWT_SECRET, REDIS_URL`.
- Recommended build order: Databricks foundation → WhatsApp integration → Pipeline Orchestrator → AI
  extraction → Dashboard → Notifications → Security → UAT → Production rollout.

## Implementation status (this build)
Backend and frontend are fully implemented and verified end-to-end locally with mocked
Databricks/WhatsApp/Quip and a heuristic AI fallback (real Claude/WhatsApp/Databricks/Quip are wired
in and activate automatically once credentials are set in `backend/.env` — see root `README.md`).
DevOps (Part 8: Docker/K8s/CI/IaC) was intentionally left out of scope for a local build — flag if you
want that added.
