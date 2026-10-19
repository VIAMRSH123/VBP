"""Vercel serverless entry point for the FastAPI backend.

Vercel serves this module as the handler for every /api/* request (see the
rewrite in vercel.json). Three things differ from running uvicorn locally:

  * the bundle filesystem is read-only, so the seeded SQLite database is copied
    to /tmp on cold start and written there for the life of the instance;
  * APScheduler cannot run in a serverless function, so it is switched off;
  * every outbound integration is forced into its mocked mode, so the public
    demo can never send a real WhatsApp message or call a paid API.

Writes made through the demo survive until the instance recycles, then the
database resets to the seeded snapshot. That is intentional for a demo.
"""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
SEED_DB = Path(__file__).resolve().parent / "seed" / "lakehouse.db"
RUNTIME_DB = Path("/tmp/lakehouse.db")

sys.path.insert(0, str(BACKEND_DIR))

if SEED_DB.exists() and not RUNTIME_DB.exists():
    shutil.copyfile(SEED_DB, RUNTIME_DB)

# Set before importing app.*: app/db.py builds the engine at import time.
os.environ.setdefault("DATABASE_URL", f"sqlite:///{RUNTIME_DB}")
os.environ.setdefault("ENABLE_SCHEDULER", "false")
os.environ.setdefault("SAP_MODE", "off")
for _mocked in ("WASENDER_API_KEY", "WASENDER_WEBHOOK_SECRET", "QUIP_API_TOKEN"):
    os.environ[_mocked] = ""

from app.main import app  # noqa: E402  (import must follow the env setup above)

__all__ = ["app"]
