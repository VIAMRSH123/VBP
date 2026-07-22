"""Quip collaboration-layer sync.

Quip is a read-oriented business view, not the system of record (Databricks is).
When QUIP_API_TOKEN is unset, syncs are written to a local JSON file under
backend/quip_mock/ so the "sync" step in the pipeline is fully exercised offline.
"""
import json
import logging
from pathlib import Path

import httpx

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("quip")

MOCK_DIR = Path(__file__).resolve().parent.parent.parent / "quip_mock"
QUIP_API_URL = "https://platform.quip.com/1"


def sync_lead(lead_number: str, snapshot: dict) -> dict:
    if not settings.use_real_quip:
        MOCK_DIR.mkdir(exist_ok=True)
        path = MOCK_DIR / f"{lead_number}.json"
        path.write_text(json.dumps(snapshot, indent=2, default=str))
        logger.info("[MOCK QUIP] synced %s -> %s", lead_number, path)
        return {"status": "mocked", "path": str(path)}

    headers = {"Authorization": f"Bearer {settings.quip_api_token}"}
    try:
        response = httpx.post(
            f"{QUIP_API_URL}/threads/new-document",
            headers=headers,
            json={"content": json.dumps(snapshot, default=str), "title": lead_number},
            timeout=10,
        )
        response.raise_for_status()
        return {"status": "synced", "response": response.json()}
    except httpx.HTTPError as exc:
        logger.error("Quip sync failed: %s", exc)
        return {"status": "failed", "error": str(exc)}
