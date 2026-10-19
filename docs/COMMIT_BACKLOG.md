# Daily Commit Backlog

A queue of real work for this repo, newest-priority-first. A scheduled Claude Code agent runs each
morning at 09:00, takes the **top unchecked item**, does it properly, verifies it, and commits.

## The rules the daily agent follows

1. **One item per run.** Finish it or leave it uncommitted — never commit a half-done item.
2. **Verify before committing.** Backend changes: `cd backend && venv/bin/python -m pytest -q`
   must stay green (baseline: 103 passing). Frontend changes: `npm --prefix frontend run build`
   must compile.
3. **No filler commits.** Whitespace churn, comment padding, version bumps with no reason,
   reformatting untouched files, or "update docs" with no substance are all forbidden. If no item
   can be done honestly, **make no commit** and say so. A gap in the heatmap is better than a
   commit that lies about work.
4. **Never commit secrets.** `backend/.env`, `docs/market-research/` (holds unencrypted API keys)
   and `KANKAR/` are gitignored. Never use `git add -A` or `git add .`; stage named paths only.
5. **Conventional commit messages** (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`),
   with a body explaining *why* when the subject isn't self-evident.
6. **Append to the log** at the bottom of this file, and tick the item off above.

---

## Queue

### A. Core pipeline test coverage

The SAP layer has 5 test files and 103 passing tests. The **original pipeline has none** — including
`orchestrator/orchestrator.py` at 598 lines, which is the centre of the whole product. The harness
already exists: `app/tests/conftest.py` provides `db`, `client`, `auth("<role>")` and `mock_sap`
fixtures, so each item below is a self-contained sitting.

- [x] **A1 — `test_extraction.py`** for `services/ai/extraction.py`. Every field label the guide
      documents (Company/Contact/Phone/Email/Product/Quantity), fields in any order, extra prose
      around them, a `LeadID:`/`Status:` status-update message, and the incomplete message that must
      still yield a partial record. Keep in sync with `docs/SALES_REP_GUIDE.md`.
- [ ] **A2 — `test_validation.py`** for `services/ai/validation.py`. Mandatory-field rules (Company,
      Contact, Product, Sales Rep, phone-or-email), phone and email format, `quantity > 0`, unknown
      product, and the rule that an incomplete record still persists as `Draft` rather than being
      dropped.
- [ ] **A3 — `test_duplicate_detection.py`**. Exact phone repeat merges into the existing lead
      (the behaviour `SALES_REP_GUIDE.md` promises reps), same company with a different contact,
      and a genuinely new lead that must not be merged.
- [ ] **A4 — `test_lead_service.py`** for the status engine. Assert every legal transition in
      `STATUS_TRANSITIONS` is accepted, every illegal one is rejected, and that each accepted
      transition writes a `lead_status_history` row.
- [ ] **A5 — `test_orchestrator.py`** for the 12-step pipeline. One end-to-end run from raw message
      to assigned lead, idempotency on a replayed execution id, retry with backoff on a transient
      failure, and the Dead Letter Queue entry once retries are exhausted.
- [ ] **A6 — `test_enrichment.py`**. Industry/customer-type/category/territory inference, lead score
      within 0–100, deal-size estimate, and that confidence metadata is recorded on the decision.
- [ ] **A7 — `test_representative_matching.py`**. Territory + product match, language preference,
      workload as tiebreak, and no-match routing to the Unassigned Queue with a manager notification.
- [ ] **A8 — `test_auth_rbac.py`**. All five roles (administrator, sales manager, sales
      representative, executive, read-only auditor) against each router, plus the server-side rep
      scoping in `api/dashboard.py` (`_scoped_rep_id`) — a sales rep must not widen their scope by
      passing `?representative_id=` for someone else.
- [ ] **A9 — `test_reminder_worker.py`**. The 24h / 48h / 72h thresholds, who each step notifies,
      and that an escalation is logged once rather than on every scheduler tick.
- [ ] **A10 — `test_wasender_parser.py`**. Both `messages.received` and
      `messages-personal.received` (Wasender fires both — see `docs/DECISIONS.md`), non-text
      message types ignored, and the signature check.
- [ ] **A11 — `test_dashboard_service.py`**. Gold KPI aggregation: pipeline value, won/lost counts
      and SLA breach counts against a known fixture set.
- [ ] **A12 — Coverage report.** Add `pytest-cov`, record the real number in the README, and set a
      floor that CI-less local runs can check.

### B. Security hardening (from `docs/SECURITY_TODO.md`)

- [ ] **B1 — Fail fast on a default `JWT_SECRET`.** Refuse to boot outside dev if it is still
      `change-me-in-production`, so the placeholder can never reach a deployment silently.
- [ ] **B2 — Retire the demo logins.** Seed with per-user generated passwords written to a
      gitignored file, or force a change on first login. Update `docs/RUNBOOK.md` and the README.
- [ ] **B3 — Rate-limit the auth endpoints.** `POST /api/auth/login` currently has no throttle.
- [ ] **B4 — SQLite backup + restore.** A script plus a documented restore drill, since
      `lakehouse.db` is the system of record.

### C. Documentation drift

- [ ] **C1 — Reconcile the "phase 7" comment.** `backend/app/config.py` marks
      `wasender_webhook_secret` as "removed together with the inbound webhook (phase 7)", but both
      the field and `POST /api/webhooks/whatsapp/wasender` are still live. Either the comment is
      stale or the removal is pending — decide, then make code and comment agree.
- [ ] **C2 — Fill the placeholder** in `docs/SALES_REP_GUIDE.md` Part 1
      (`[FILL IN: the WhatsApp number...]`), or state plainly that it is pending a paid plan.
- [ ] **C3 — Refresh the README's mocked-vs-real table.** It predates both the SAP sync and the
      Vercel deployment, so it now understates what the project does.
- [ ] **C4 — Document the Vercel deployment** in `docs/RUNBOOK.md`: how to rebuild the seed
      snapshot, redeploy, and what resets when a function instance recycles.

### D. Frontend quality

- [ ] **D1 — Set up Vitest + React Testing Library.** There are currently zero frontend tests.
- [ ] **D2 — Test `DataTable`** — sorting, pagination, the empty state and keyboard row navigation.
      It is the shared component most of the UI is built from.
- [ ] **D3 — Automated accessibility pass.** Run axe over each route and fix what it reports.
- [ ] **D4 — Responsive audit** at 320/768/1024/1440, per the project's own testing rules.

---

## Log

Append one line per commit: `YYYY-MM-DD — <item> — <commit subject>`. The line goes in the same
commit as the work, so the sha isn't known yet — leave it out.

- 2026-10-20 — setup — chore: tighten gitignore for secrets, snapshots and vault noise (e5f550e)
- 2026-10-20 — setup — feat: run the demo backend as a Vercel serverless function (49b87a0)
- 2026-10-19 — A1 — test: cover lead extraction and fix phone, quantity and email-only bugs it exposed
