# Established Decisions

Do not silently revert these — they were made deliberately during earlier sessions.

## Frontend design system

"Dark Enterprise Intelligence" direction — navy/near-black sidebar, amber "AI" accent, Space
Grotesk headings, warm off-white body background, bento-style KPI cards, dark glass chart cards.
Tokens live in `frontend/src/index.css`. Do not flatten this back to a plain light theme.

## WhatsApp integration

Uses **WaSenderAPI** (QR-linked, wasenderapi.com), not Meta's official WhatsApp Cloud API —
switched because Meta's business verification was blocking progress. Webhook route is
`POST /api/webhooks/whatsapp/wasender`. The parser accepts **both** `messages.received` and
`messages-personal.received` event names (Wasender fires both for the same real message) — don't
narrow this back to a single event name.

## Deployment target

A cheap VPS, not a personal laptop + tunnel, once this moves toward real daily use. Meta business
verification is deferred, not abandoned — revisit once the Wasender path proves out at scale.

## DevOps scope

DevOps (Docker/K8s/CI/IaC) is intentionally out of scope for this build per the blueprint — don't
add it unless explicitly asked.
