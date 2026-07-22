# VBP Restart Runbook

Use this whenever the laptop has been off/asleep and the app needs to come back up. Follow it in
order — steps 4 and 5 are the ones people forget, and they're the #1 cause of "why aren't messages
showing up."

## 1. Start the backend

```bash
cd /Users/viamrsh/Desktop/VBP/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

## 2. Start the frontend

```bash
cd /Users/viamrsh/Desktop/VBP/frontend
npm run dev -- --host
```

## 3. Start the Cloudflare tunnel

Needed so real WhatsApp messages (via Wasender) can reach your local backend.

```bash
cd /Users/viamrsh/Desktop/VBP/backend
cloudflared tunnel --url http://localhost:8000 > cloudflared.log 2>&1 &
```

Then get the new URL:

```bash
grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' cloudflared.log | tail -1
```

## 4. Update the Wasender webhook URL — do this every time

The tunnel URL **always changes** on restart. Go to the Wasender dashboard → **Webhook
Configuration** → update **Payload URL** to:

```
<new tunnel URL>/api/webhooks/whatsapp/wasender
```

→ Save Changes. Skipping this step is the most common reason messages silently stop arriving.

## 5. Check the Wasender session is still connected

The free-trial WhatsApp session can log itself out on its own, independent of anything on your
laptop. If real messages still aren't arriving after step 4, check the session status in the
Wasender dashboard *first* — re-scan the QR code if it shows logged out — before assuming
anything else is broken. Their "Simulate Incoming Message" test button is synthetic and will keep
succeeding even with a dead session, so it won't tell you the session is the problem.

## 6. Health check

```bash
curl -s -o /dev/null -w "backend: %{http_code}\n" http://localhost:8000/docs
curl -s -o /dev/null -w "tunnel: %{http_code}\n" https://<new-tunnel-url>/docs
```

Both should print `200`.

## Demo logins

| Role | Email | Password |
|---|---|---|
| Administrator | admin@company.com | Admin@123 |
| Sales Manager | manager@company.com | Manager@123 |
| Sales Representative | rep@company.com | Rep@123 |
| Executive | exec@company.com | Exec@123 |
| Read-Only Auditor | auditor@company.com | Auditor@123 |

Retire these before real day-to-day use — see @docs/SECURITY_TODO.md.

## Tooling quirks

- The `preview_start` MCP tool hits a sandbox `getcwd` error in this environment when launched by
  `{name}` from `.claude/launch.json`. Launch backend/frontend manually via Bash with
  `dangerouslyDisableSandbox: true` and `run_in_background: true` instead; `preview_start` with
  `{url: "http://localhost:5173"}` works fine for browser verification once the servers are up.
- **`.env` changes are not picked up by `uvicorn --reload`** — only `.py` file changes trigger the
  watcher. Restart the backend process manually after editing `backend/.env`.

## WaSenderAPI free-trial quirks

- Outbound sends are capped at **1 request/minute** — inbound lead ingestion is unaffected, but
  outbound notifications (rep assignment alerts, reminders) will hit `429 Too Many Requests` past
  that rate.
- The QR-linked WhatsApp session **logs itself out periodically** on the free trial — see step 5
  above for how to diagnose this before assuming a webhook delivery bug.
