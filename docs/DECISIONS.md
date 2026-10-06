# Established Decisions

Do not silently revert these — they were made deliberately during earlier sessions.

## Frontend design system

**Vercel-inspired monochrome (decided 2026-10-06, supersedes "Dark Enterprise Intelligence").**
The earlier navy/amber/glass direction was replaced deliberately at the user's request. Do not
bring it back (no backdrop-blur "liquid glass", no 18–20px radii, no Space Grotesk, no coloured
decorative gradients).

- **Palette:** neutral foundation — light `#fff / #fafafa / #171717 / #666 / #eaeaea`, dark
  `#000 / #0a0a0a / #111 / #fafafa / #a1a1a1 / #262626`. Colour only carries meaning: green =
  positive/won, red = critical/lost, amber = warning, blue = information/focus. Amber `--ai*`
  tokens are reserved for the AI "Next Best Action" card.
- **Shape and type:** Inter only; 10px cards, 6px controls, 1px borders, no card shadows (shadow only
  on popovers/modals); 13px controls, small uppercase metadata labels.
- **Shell:** two-tier header — logo/product, ⌘K command palette, notifications, theme, user menu,
  then a tab strip containing every nav item (no hidden overflow menu).
- **Shared components are the system:** `DataTable` (sorting, pagination, empty state), `EmptyState` /
  `ErrorState`, `StatusBadge`/`Badge` (tone-based, theme-aware via tokens), `StatCard`, `KpiTile`,
  `BarList`, `ChartTooltip`. New pages should use these and token variables, not hard-coded hex or
  one-off table markup. Tokens live in `frontend/src/index.css`.
- **Motion:** 120–250ms, transform/opacity only, disabled under `prefers-reduced-motion`. No
  continuous or blur-heavy effects.
- **Warehouse exception:** the Warehouse page's dark isometric stage (cyan hover, green selected
  warehouse) is intentionally kept as the visual centrepiece in both themes; only its surrounding
  chrome follows the system above.

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
