# Security Before Real/Production Use

- `JWT_SECRET` in `backend/.env` is still the placeholder default (`change-me-in-production`) —
  must be replaced before anyone other than a developer relies on this.
- Demo logins from `backend/seed_data.py` (`admin@company.com` / `Admin@123`, etc. — full list in
  @docs/RUNBOOK.md) must be retired before real day-to-day use.
- `backend/.env` holds real secrets (`WASENDER_API_KEY`, `WASENDER_WEBHOOK_SECRET`) — never commit
  it.
- `WEBSITE_ENQUIRY_TOKEN` (backend) / `ENQUIRY_WEBHOOK_TOKEN` (website) — use a long random value,
  identical on both sides, and never commit it. The website endpoint stays closed (503) until it is
  set, so leaving it empty is safe; a weak value is not.
