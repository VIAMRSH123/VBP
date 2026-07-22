# Security Before Real/Production Use

- `JWT_SECRET` in `backend/.env` is still the placeholder default (`change-me-in-production`) —
  must be replaced before anyone other than a developer relies on this.
- Demo logins from `backend/seed_data.py` (`admin@company.com` / `Admin@123`, etc. — full list in
  @docs/RUNBOOK.md) must be retired before real day-to-day use.
- `backend/.env` holds real secrets (`WASENDER_API_KEY`, `WASENDER_WEBHOOK_SECRET`) — never commit
  it.
