# VBP Enterprise Lead Management — Handover

Paste this whole file into a new chat to resume with full context.

## Project

Enterprise AI-powered lead management platform for **Telangana Food Suncons (TFS)**, built from a
10-part + appendix blueprint in `/Users/viamrsh/Desktop/VBP/`. WhatsApp messages from sales reps →
Claude-style AI extraction → validation → duplicate detection → Databricks-style local store
(Bronze/Silver/Gold) → enrichment → representative matching → notifications → dashboard.

- **Backend**: FastAPI + SQLAlchemy/SQLite, at `/Users/viamrsh/Desktop/VBP/backend`
- **Frontend**: React + TS + Tailwind v4, at `/Users/viamrsh/Desktop/VBP/frontend`
- Full architecture/build notes: `docs/BLUEPRINT.md` and root `README.md` in the project.

## How to run

```bash
# Backend (port 8000)
cd /Users/viamrsh/Desktop/VBP/backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (port 5173)
cd /Users/viamrsh/Desktop/VBP/frontend && npm run dev -- --host
```

Both are typically run manually via Bash with `dangerouslyDisableSandbox: true` and
`run_in_background: true` — the `preview_start` MCP tool hits a sandbox `getcwd` error in this
environment when launched by name from `.claude/launch.json`; launching by `{url: "http://localhost:5173"}`
instead of `{name: "frontend"}` works fine for browser verification.

Demo logins (from `backend/seed_data.py`): `admin@company.com` / `Admin@123` (also manager@, rep@,
exec@, auditor@company.com with role-named passwords, e.g. `Manager@123`).

## Design system — IMPORTANT

The frontend uses a **Vercel-inspired monochrome system** (redesigned 2026-10-06; it replaced the earlier
"Dark Enterprise Intelligence" navy/amber/glass look — do not bring that back). The full rules live in
`docs/DECISIONS.md`; tokens live in `frontend/src/index.css`. In short: neutral palette (light + dark),
Inter only, 10px cards / 6px controls, 1px borders, no card shadows, colour only for meaning (green
positive, red critical, amber warning, blue info), amber reserved for the AI "Next Best Action" card.

**Shared components are the system** — build new UI from them rather than one-off markup:
`DataTable` (sorting, pagination, empty state, keyboard rows), `leadColumns` (shared lead columns),
`EmptyState`/`ErrorState`, `StatusBadge`/`Badge`, `StatCard`, `KpiTile`, `BarList`, `CategoryBarChart`,
`ChartTooltip`, `PageHeader`, `CommandPalette`.

**TFS branding**: logo at `frontend/public/tfs-logo.png` (+ `tfs-logo-transparent.png` for dark mode);
`components/TfsMark.tsx` swaps between them by theme.

**Shell** (`layouts/TopBarLayout.tsx`): two-tier header — logo / product name, centred ⌘K search
(command palette: jump to any page you have access to, toggle theme, log out, or "Search leads for …"
which opens `/leads?q=…`), notifications, theme toggle and account menu; below it a tab strip with every
nav item (`components/navConfig.ts`, role-filtered). Route changes get a subtle fade (`page-enter`).

**Dashboard structure**: `pages/TFSDashboardPage.tsx` has accessible underline tabs (Overview /
Engagement / Won / Lost / Rep Performance / Unassigned) plus a rep filter (`RepFilterSelect`). Tab content
lives in `pages/dashboard-tabs/*.tsx`. Overview leads with one primary KPI (Pipeline Value) and
supporting KPIs whose context lines are computed from real data (no invented trends). Backend endpoints:
`GET /api/dashboard/tabs/{overview,engagement,won,lost,unassigned}` and `GET /api/reports/rep-performance`,
all accepting `?representative_id=`. Sales reps are scoped server-side to their own data regardless of
query params (`_scoped_rep_id` in `api/dashboard.py`).

**Warehouse page** (`/warehouse`, `pages/WarehousePage.tsx` + `pages/warehouse/`): isometric SVG map of 6
warehouses (hover → cyan, click → green, details panel updates), driven entirely by mock data in
`pages/warehouse/data.ts` — replace that module with an API call when a real inventory source exists.
The dark stage is intentionally kept in both themes.

## WhatsApp integration — DONE, verified end-to-end with a real message (2026-07-19)

**Goal**: get real WhatsApp messages flowing into the dashboard as leads. **Achieved** — a real
WhatsApp text sent from a second phone to the QR-linked number produced lead `L-10005` (Al Fardan
Construction) on the dashboard's Engagement tab, full pipeline (extraction → validation → dedup →
enrichment → rep assignment → Quip mock sync).

**Decision (2026-07-19): switched from Meta WhatsApp Cloud API to WaSenderAPI**
(wasenderapi.com) — a third-party WhatsApp API that links to a real WhatsApp number via QR-code
scan instead of Meta's Business Platform / app-review flow. No business verification, no test-number
limits, no 24h token expiry, unlimited messages for a flat $6-45/mo depending on plan. Trade-off: this
is an unofficial client (not Meta's official Business API), so there's some risk of the linked number
being flagged by WhatsApp — acceptable for now, revisit if it becomes an issue at scale. Everything
below about Meta App Dashboard / WhatsApp Manager / test numbers is now **superseded** — kept only for
history in case we ever need to fall back to the official Cloud API.

### What's built (backend, done)
- `POST /api/webhooks/whatsapp` — simple test format `{from_phone, message}`, used by
  `backend/scripts/whatsapp_simulator.py`. Still works, unrelated to the real integration.
- `POST /api/webhooks/whatsapp/wasender` — the real one. No handshake needed (unlike Meta's GET
  verify-token dance) — parses WaSenderAPI's webhook payload (`app/services/whatsapp_wasender_parser.py`)
  and feeds each inbound text message through the same `PipelineOrchestrator.run_lead_ingestion()`
  used by the simulator. Signature check compares the `X-Webhook-Signature` header against
  `WASENDER_WEBHOOK_SECRET` (`app/integrations/whatsapp_client.py` → `verify_webhook_signature`) —
  direct string compare, not HMAC. **Discovered live**: Wasender fires *both* `messages.received` and
  `messages-personal.received` for the same 1:1 message — the parser accepts either event name
  (`_INBOUND_EVENTS` set), relying on the pipeline's existing duplicate-detection to merge if both
  ever land for the same message.
- Sending outbound messages (`app/integrations/whatsapp_client.py` → `send_message`) posts to
  `https://www.wasenderapi.com/api/send-message` with `Authorization: Bearer WASENDER_API_KEY`.
- `backend/.env` has real values now for `WASENDER_API_KEY` and `WASENDER_WEBHOOK_SECRET` (redacted
  here — see the file directly).
- Old Meta-specific code removed: `app/services/whatsapp_meta_parser.py` deleted, the Meta GET
  verify-handshake route removed, `whatsapp_phone_number_id`/`meta_app_secret` config fields removed.

### Known limitation — outbound sends are rate-limited on the free trial
Wasender's free trial caps the send-message API at **1 request/minute**. Inbound lead ingestion is
unaffected, but outbound WhatsApp notifications (rep assignment alerts, reminders, etc.) hit
`429 Too Many Requests` past that rate — confirmed in `backend/server.log`. Fine for testing; **needs
a paid Wasender plan before dad relies on this daily**, since assignment/reminder notifications are
part of the core workflow.

### Known limitation — free trial session logs itself out
Diagnosed 2026-07-19: after the initial successful test burst, real WhatsApp messages stopped
arriving while Wasender's own **"Simulate Incoming Message"** button kept succeeding every time. Root
cause: the QR-linked WhatsApp **session had logged out** on the free trial. The simulator button is
synthetic (generated server-side by Wasender, doesn't touch the real WhatsApp connection at all), so
it kept passing even with the session dead — that's *why* it looked like a delivery bug rather than a
disconnected session. **Lesson for next time something "stops working": check the session status in
the Wasender dashboard first** (Connected vs. logged out) before re-debugging tunnel/webhook/signature
config — if the session shows Connected but real messages still don't arrive, *then* it's a genuine
delivery bug worth chasing. Free trial sessions appear to log out on their own periodically; a paid
plan should be more stable — factor this into the "needs a paid plan before daily use" decision above.

### Wasender setup steps (for reference / redoing on a new session)
1. Sign up at wasenderapi.com, pick a plan (Basic $6/mo covers 1 number).
2. Create a WhatsApp session and scan the QR code with the phone that should send/receive leads.
3. Copy the session's **API Key** (API Credentials page) → `backend/.env` as `WASENDER_API_KEY`.
4. In **Webhook Configuration** (not the API Credentials page — a separate per-session screen) set
   **Payload URL** to `<tunnel or server URL>/api/webhooks/whatsapp/wasender` (HTTPS required).
5. Copy the **Webhook Secret** shown there → `backend/.env` as `WASENDER_WEBHOOK_SECRET`.
6. Under **Subscriptions**, enable `messages.received` (and ideally `messages-personal.received` too
   — both fire for real 1:1 messages in practice, our parser accepts either).
7. Use the dashboard's own **"Simulate Incoming Message"** button first to confirm connectivity before
   trusting a real WhatsApp message test — this isolates "is the URL/secret wired right" from "is a
   real message event firing," which is exactly how this was debugged.
8. Restart the backend after any `.env` change (not auto-reloaded — only `.py` file changes trigger
   uvicorn's `--reload` watcher).

### Public tunnel (for Wasender to reach our local backend)
No ngrok account (needs signup we can't do). Using a **Cloudflare quick tunnel** instead (zero signup):
```bash
cloudflared tunnel --url http://localhost:8000
```
**Current live URL: `https://hung-extremely-modular-mustang.trycloudflare.com`** — this was just
regenerated (the previous one, `restaurants-proceed-street-terrain.trycloudflare.com`, died). These
URLs are ephemeral and change on every tunnel restart — **check `backend/cloudflared.log` for the
current URL before trusting this one**, and update the Webhook URL in the Wasender dashboard if it's
changed.

### Superseded — old Meta App / WhatsApp Manager status (history only, not the current path)
- Meta Business app created ("Tfs" / similar), WhatsApp use case added.
- Webhook Callback URL + Verify token were configured and verified successfully against a prior
  tunnel URL, then went stale when the tunnel rotated.
- Attempted to register the user's real number `+974 5119 9352` in WhatsApp Manager → blocked:
  "already registered to a WhatsApp account" (it's tied to a Composio-managed connection — see below).
  Hit **"Account Restricted — verify your business"** + missing payment method when trying to migrate
  it. This business-verification hurdle is exactly what prompted the move to WaSenderAPI.

### Composio — tried, doesn't work for inbound
Connected the user's WhatsApp Business Account to Composio (session id `sing`, toolkit `whatsapp`,
connected account `ca_9gifPzlPDfxT`). Confirmed via direct testing that **Composio's WhatsApp toolkit
cannot relay inbound messages to a custom webhook URL** — `WHATSAPP_SUBSCRIBE_APP` explicitly rejects
`override_callback_uri`/`verify_token`: "Use the configured WhatsApp app webhook settings." Composio
hosts its own webhook infra; there's no exposed way to redirect it to ours, and WhatsApp Cloud API has
no polling/read endpoint either. **Conclusion: Composio is only useful here for outbound sends**
(`WHATSAPP_SEND_MESSAGE` etc.) as a potential alternative to our own Graph API token — not for reading
messages. Don't re-attempt the inbound-via-Composio path.

Also discussed (not built): a secondary lead-intake channel via a shared mailbox that reps CC, read via
Composio's Gmail toolkit (already connected, account `gmail_lohan-gaspar` /
richy.viamrsh126@gmail.com). Composio Gmail is **poll-based** (`GMAIL_FETCH_EMAILS`/`GMAIL_LIST_HISTORY`),
no push trigger — would need a scheduled poll job (same pattern as the existing APScheduler reminder
job in `app/workers/scheduler.py`). Recommended as an *addition* to the WhatsApp webhook, not a
replacement — not yet built.

## Website enquiries → leads (added 2026-10-22)

The TFS website (`website/`, its own repo) now posts trade enquiries — including the buyer's
"enquiry basket" of products, pack sizes and quantities — to `POST /api/webhooks/website`
(`app/api/website.py`). They run through the same `PipelineOrchestrator.run_lead_ingestion()` as
WhatsApp leads, with `channel="website"`:

- **Structured fields skip the text extractor** (`app/services/website_enquiry.py → to_lead_fields`),
  so company names aren't truncated at extractor keywords. The rep-style text is still stored as the
  raw record, with visitor text neutralised (no colons, no "lead id" / "status update" phrases).
- **The website channel never applies status updates** — an anonymous visitor cannot change
  someone else's lead, even by typing "Lead ID: L-10005 Status: Lost".
- Auth: `Authorization: Bearer <WEBSITE_ENQUIRY_TOKEN>` (constant-time compare), checked before the
  body is parsed. With the token unset the endpoint returns 503 for everything.
- Leads arrive with `source = "website"`, origin "Website enquiry".
- To switch on: set `WEBSITE_ENQUIRY_TOKEN` in `backend/.env` (then restart — `.env` is not
  hot-reloaded), and on the website set `ENQUIRY_WEBHOOK_URL=<backend>/api/webhooks/website` and
  `ENQUIRY_WEBHOOK_TOKEN` to the same value.
- Verified end-to-end over HTTP on 2026-10-22 against a throwaway instance. Tests:
  `app/tests/test_website_enquiry.py` (18).
- **Testing gotcha:** the Quip mock writes to `backend/quip_mock/<lead>.json` regardless of which
  database an instance uses, so a throwaway backend's first lead (`L-10000`) overwrites the real
  `L-10000` snapshot. Point `quip_client.MOCK_DIR` elsewhere for ad-hoc runs (the pytest fixture
  `quiet_quip` already does).

## Sales Rep / Dad Training Guide

The full non-technical, print/share-friendly version of "how to actually use this day to day" lives
in its own file: **`docs/SALES_REP_GUIDE.md`**. Keep that file as the single source of truth for
end-user training — don't duplicate its content back into this handover doc, just update
`SALES_REP_GUIDE.md` directly if the message format or workflow changes, since it needs to stay in
sync with `app/services/ai/extraction.py`'s field patterns and `app/services/ai/validation.py`'s
mandatory-field rules.

### Immediate next steps (WhatsApp ingestion itself is done — this is what's left)
1. Send the remaining sample test messages (dedup test, incomplete-lead/Draft test, status-update
   test) to finish exercising the pipeline's edge cases — see chat history for the exact message text.
2. Per the earlier deployment decision ([[project_deployment_plan]]), move this whole setup onto a
   VPS so the tunnel URL isn't tied to a personal laptop staying on.
3. Upgrade off the Wasender free trial before relying on this daily — the 1 req/min send cap breaks
   outbound notifications (see "Known limitation" above).
4. Security hardening pass before dad logs in: change demo passwords, set a real `JWT_SECRET`, set up
   SQLite backups (see earlier deployment-plan checklist).
