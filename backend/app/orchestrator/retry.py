import logging
import time
from typing import Callable, TypeVar

T = TypeVar("T")
logger = logging.getLogger("orchestrator.retry")

MAX_ATTEMPTS = 3
BASE_BACKOFF_SECONDS = 0.2


def with_retry(fn: Callable[[], T], stage: str, on_attempt_failed: Callable[[int, Exception], None] | None = None) -> T:
    """Retry a transient operation up to MAX_ATTEMPTS times with exponential backoff.

    Raises the last exception if every attempt fails, for the caller to route to the DLQ.
    """
    last_exc: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - intentionally broad: any stage failure is retryable
            last_exc = exc
            logger.warning("Stage '%s' attempt %d/%d failed: %s", stage, attempt, MAX_ATTEMPTS, exc)
            if on_attempt_failed:
                on_attempt_failed(attempt, exc)
            if attempt < MAX_ATTEMPTS:
                time.sleep(BASE_BACKOFF_SECONDS * (2 ** (attempt - 1)))
    assert last_exc is not None
    raise last_exc
