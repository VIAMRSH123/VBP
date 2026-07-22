"""Thin wrapper around the Anthropic API used by every AI skill service.

If ANTHROPIC_API_KEY is not configured, callers should use their own
deterministic fallback logic instead of calling this client — see each
service module in app/services/ai/ for the fallback implementations.
"""
import json
import re

from app.config import get_settings

settings = get_settings()

_client = None


def _get_client():
    global _client
    if _client is None:
        import anthropic

        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def is_available() -> bool:
    return settings.use_real_claude


def complete_json(system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> dict:
    """Call Claude with a prompt that must return a single JSON object, and parse it.

    Raises RuntimeError if the API key is not configured or the response
    cannot be parsed as JSON.
    """
    if not is_available():
        raise RuntimeError("ANTHROPIC_API_KEY not configured; use the heuristic fallback instead")

    client = _get_client()
    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(block.text for block in response.content if hasattr(block, "text"))
    return _extract_json(text)


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise RuntimeError(f"No JSON object found in Claude response: {text[:200]}")
    return json.loads(match.group(0))
