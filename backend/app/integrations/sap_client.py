"""SAP Business One Service Layer client (read-only).

One `session()` per sync run: log in, read, log out (logging out frees the SAP license). Mock mode
builds the very same `httpx.Client`, only with an in-process fake server as its transport, so login,
session-expiry handling and paging are exercised identically in mock and live mode.

Never logs the password or session cookies.
"""
import logging
from contextlib import contextmanager
from typing import Iterator

import httpx

from app.config import Settings, get_settings
from app.integrations.sap_entities import api_version_from_url
from app.orchestrator.retry import with_retry

logger = logging.getLogger("sap")

SESSION_EXPIRED_CODE = -5002
TRANSIENT_STATUS = {502, 503, 504}


class SapError(Exception):
    pass


class SapAuthError(SapError):
    pass


class _Transient(SapError):
    """Raised only inside the retry wrapper so with_retry retries network and 5xx errors, nothing else."""


def _error_text(response: httpx.Response) -> str:
    try:
        error = response.json().get("error", {})
        message = error.get("message", {})
        text = message.get("value") if isinstance(message, dict) else message
        return f"{error.get('code', response.status_code)}: {text or response.reason_phrase}"
    except Exception:  # noqa: BLE001 - body is not JSON
        return f"{response.status_code}: {response.reason_phrase}"


def _session_expired(response: httpx.Response) -> bool:
    if response.status_code == 401:
        return True
    if response.status_code >= 400:
        try:
            return response.json().get("error", {}).get("code") == SESSION_EXPIRED_CODE
        except Exception:  # noqa: BLE001
            return False
    return False


class SapSession:
    def __init__(self, client: httpx.Client, version: str, settings: Settings):
        self.client = client
        self.version = version
        self.settings = settings
        self.logged_in = False

    # -- auth ---------------------------------------------------------------

    def login(self) -> None:
        payload = {
            "CompanyDB": self.settings.sap_company_db,
            "UserName": self.settings.sap_username,
            "Password": self.settings.sap_password,
        }
        response = self._send("POST", "Login", json=payload)
        if response.status_code >= 400:
            raise SapAuthError(f"SAP login failed ({_error_text(response)})")
        self.logged_in = True

    def logout(self) -> None:
        if not self.logged_in:
            return
        try:
            self.client.post("Logout")
        except httpx.HTTPError:
            logger.debug("SAP logout failed (ignored)")
        self.logged_in = False

    # -- requests -----------------------------------------------------------

    def _send(self, method: str, url: str, **kwargs) -> httpx.Response:
        def attempt() -> httpx.Response:
            try:
                response = self.client.request(method, url, **kwargs)
            except httpx.TransportError as exc:
                raise _Transient(str(exc)) from exc
            if response.status_code in TRANSIENT_STATUS:
                raise _Transient(_error_text(response))
            return response

        try:
            return with_retry(attempt, stage=f"sap {method} {url.split('?')[0]}")
        except _Transient as exc:
            raise SapError(f"SAP request failed after retries: {exc}") from exc

    def _get(self, url: str, **kwargs) -> httpx.Response:
        response = self._send("GET", url, **kwargs)
        if _session_expired(response):
            logger.info("SAP session expired; logging in again")
            self.login()
            response = self._send("GET", url, **kwargs)
            if _session_expired(response):
                raise SapAuthError("SAP session could not be re-established")
        if response.status_code >= 400:
            raise SapError(f"SAP request failed ({_error_text(response)})")
        return response

    # -- reads --------------------------------------------------------------

    def iter_entity(
        self,
        entity: str,
        *,
        filter: str | None = None,  # noqa: A002 - mirrors the OData option name
        select: tuple[str, ...] | list[str] | None = None,
        orderby: str | None = None,
        page_size: int | None = None,
    ) -> Iterator[dict]:
        params: dict[str, str] = {}
        if filter:
            params["$filter"] = filter
        if select:
            params["$select"] = ",".join(select)
        if orderby:
            params["$orderby"] = orderby
        headers = {"Prefer": f"odata.maxpagesize={page_size or self.settings.sap_page_size}"}

        url: str | None = entity
        request_params: dict[str, str] | None = params
        while url:
            response = self._get(url, params=request_params, headers=headers)
            body = response.json()
            yield from body.get("value", [])
            # v2 (OData v4) uses "@odata.nextLink", v1 (OData v3) "odata.nextLink"; accept either
            # regardless of the configured version. The link may be relative or absolute.
            url = body.get("@odata.nextLink") or body.get("odata.nextLink")
            if url:
                # Some servers drop the original query options from the link; re-apply any that are
                # missing so a filtered read can never silently turn into an unfiltered one.
                present = set(httpx.URL(url).params.keys())
                request_params = {k: v for k, v in params.items() if k not in present} or None

    def fetch_all(self, entity: str, **kwargs) -> list[dict]:
        return list(self.iter_entity(entity, **kwargs))

    def ping(self) -> bool:
        self._get("Warehouses", params={"$top": "1"})
        return True


def _build_client(settings: Settings, transport: httpx.BaseTransport | None) -> tuple[httpx.Client, str]:
    timeout = settings.sap_timeout_seconds
    if transport is not None or settings.sap_mode_normalized == "mock":
        from app.integrations import sap_mock

        server = sap_mock.get_mock_server()
        client = httpx.Client(
            base_url=f"{sap_mock.MOCK_BASE_URL}/b1s/{server.version}/",
            transport=transport or server.transport(),
            timeout=timeout,
        )
        return client, server.version

    base = settings.sap_base_url.rstrip("/")
    verify: bool | str = settings.sap_ca_bundle or settings.sap_verify_tls
    if verify is False:
        logger.warning("SAP_VERIFY_TLS is disabled: the SAP server certificate is NOT being verified")
    return httpx.Client(base_url=base + "/", timeout=timeout, verify=verify), api_version_from_url(base)


@contextmanager
def session(settings: Settings | None = None, transport: httpx.BaseTransport | None = None) -> Iterator[SapSession]:
    settings = settings or get_settings()
    client, version = _build_client(settings, transport)
    sap = SapSession(client, version, settings)
    try:
        sap.login()
        yield sap
    finally:
        sap.logout()
        client.close()
