# CLAUDE.md

Project-specific context for Claude Code sessions in this repo — **VBP** (Telangana Food Suncons
lead management platform). Complements the global coding-style/testing/security rules already
configured; covers only what's specific to this project.

## Where to look first

- @docs/HANDOVER.md — living technical handover doc. Paste it into a new session to resume with
  full context: current state of the WhatsApp integration, deployment decisions, known
  issues/limitations.
- @docs/BLUEPRINT.md — condensed reference of the original 10-part + appendix blueprint this
  project was built from.
- @docs/SALES_REP_GUIDE.md — non-technical, end-user training doc for sales reps and whoever runs
  the dashboard day to day. Keep in sync with `backend/app/services/ai/extraction.py` (message
  field patterns) and `backend/app/services/ai/validation.py` (mandatory-field rules) if either
  changes.
- @docs/RUNBOOK.md — restart steps, local dev/tooling quirks, WaSenderAPI quirks, demo logins.
- @docs/DECISIONS.md — established product/architecture decisions — do not silently revert these.
- @docs/SECURITY_TODO.md — must-fix items before real/production use.
- @README.md — stack overview, what's mocked vs. real, project layout.

## Running locally

```bash
# Backend (port 8000)
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (port 5173)
cd frontend && npm run dev -- --host
```

See @docs/RUNBOOK.md for the full restart sequence (Cloudflare tunnel, Wasender webhook update,
health checks) — the tunnel/webhook step is easy to forget and is the most common cause of
messages silently not arriving.
