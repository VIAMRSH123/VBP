from datetime import date

import httpx
import pytest

from app.config import Settings
from app.integrations import sap_client, sap_mock
from app.integrations.sap_client import SapAuthError, SapError
from app.integrations.sap_entities import date_filter, odata_date_literal

AS_OF = date(2026, 10, 7)


def make_settings(**overrides) -> Settings:
    return Settings(sap_mode="mock", sap_company_db="db", sap_username="u", sap_password="p", **overrides)


@pytest.fixture()
def server():
    return sap_mock.reset_mock_server(as_of=AS_OF, version="v1")


@pytest.mark.parametrize("version", ["v1", "v2"])
def test_paging_follows_next_link_for_both_odata_versions(version):
    server = sap_mock.reset_mock_server(as_of=AS_OF, version=version)
    with sap_client.session(make_settings()) as sap:
        rows = sap.fetch_all("Items", page_size=7)
    expected = server.data["Items"]
    assert len(rows) == len(expected) > 7
    assert [r["ItemCode"] for r in rows] == [r["ItemCode"] for r in expected]
    assert len({r["ItemCode"] for r in rows}) == len(rows)  # no duplicates across pages
    assert sum(1 for line in server.requests if line == "GET Items") >= 2


def test_default_page_size_is_applied_by_the_server_when_none_requested(server):
    # BusinessPartners has more than the SL default of 20, so a client that ignored nextLink would truncate.
    with sap_client.session(make_settings(sap_page_size=20)) as sap:
        rows = sap.fetch_all("BusinessPartners")
    assert len(rows) == len(server.data["BusinessPartners"]) > 20


@pytest.mark.parametrize("version", ["v1", "v2"])
def test_date_filter_literal_is_quoted_for_v1_and_bare_for_v2(version):
    server = sap_mock.reset_mock_server(as_of=AS_OF, version=version)
    since = date(2026, 9, 20)
    assert odata_date_literal(since, version) == ("2026-09-20" if version == "v2" else "'2026-09-20'")
    with sap_client.session(make_settings()) as sap:
        rows = sap.fetch_all("SalesOpportunities", filter=date_filter("UpdateDate", since, version))
    expected = [o for o in server.data["SalesOpportunities"] if o["UpdateDate"] >= "2026-09-20"]
    assert 0 < len(rows) < len(server.data["SalesOpportunities"])
    assert {r["SequentialNo"] for r in rows} == {o["SequentialNo"] for o in expected}


def test_select_limits_returned_fields(server):
    with sap_client.session(make_settings()) as sap:
        rows = sap.fetch_all("BusinessPartners", select=("CardCode", "CardName"), filter="CardType eq 'cLid'")
    assert rows and all(set(r) == {"CardCode", "CardName"} for r in rows)
    assert len(rows) == len(sap_mock.LEADS)


def test_session_expiry_triggers_exactly_one_relogin_and_no_data_loss(server):
    server.expire_session_after = 2  # the second authenticated read finds the session gone
    with sap_client.session(make_settings()) as sap:
        rows = sap.fetch_all("Items", page_size=10)
    assert len(rows) == len(server.data["Items"])
    assert server._logins == 2  # initial login + one re-login


def test_unrecoverable_session_failure_raises_auth_error():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/Login"):
            return httpx.Response(200, json={"SessionId": "x"}, headers=[("set-cookie", "B1SESSION=x; path=/")])
        return httpx.Response(401, json={"error": {"code": -5002, "message": {"value": "Invalid session"}}})

    with pytest.raises(SapAuthError):
        with sap_client.session(make_settings(), transport=httpx.MockTransport(handler)) as sap:
            sap.fetch_all("Items")


def test_transient_5xx_is_retried_then_succeeds(server):
    server.fail_next = [503]
    with sap_client.session(make_settings()) as sap:
        assert sap.ping() is True


def test_persistent_5xx_gives_up_with_sap_error(server):
    server.fail_next = [503, 503, 503]
    with pytest.raises(SapError, match="after retries"):
        with sap_client.session(make_settings()) as sap:
            sap.ping()


def test_login_with_wrong_credentials_fails_without_leaking_the_password(server):
    server.require_credentials = ("db", "u", "right-password")
    settings = Settings(sap_mode="mock", sap_company_db="db", sap_username="u", sap_password="hunter2-secret")
    with pytest.raises(SapAuthError) as caught:
        with sap_client.session(settings):
            pass
    assert "hunter2-secret" not in str(caught.value)


def test_login_with_correct_credentials_works(server):
    server.require_credentials = ("db", "u", "p")
    with sap_client.session(make_settings()) as sap:
        assert sap.ping() is True


def test_logout_is_called_at_the_end_of_a_session(server):
    with sap_client.session(make_settings()) as sap:
        sap.ping()
    assert server.requests[-1] == "POST Logout"
    assert not server.sessions


def test_server_that_drops_filters_from_next_link_still_returns_filtered_rows():
    server = sap_mock.reset_mock_server(as_of=AS_OF)
    original_read = server._read

    def lossy_read(entity, request):
        response = original_read(entity, request)
        body = response.json()
        if "odata.nextLink" in body:  # strip everything but $skip from the link
            skip = body["odata.nextLink"].split("$skip=")[1].split("&")[0]
            body["odata.nextLink"] = f"{entity}?$skip={skip}"
            return httpx.Response(200, json=body)
        return response

    server._read = lossy_read
    with sap_client.session(make_settings()) as sap:
        rows = sap.fetch_all("BusinessPartners", filter="CardType eq 'cCustomer'", page_size=5)
    assert len(rows) == len(sap_mock.CUSTOMERS)
    assert all(r["CardType"] == "cCustomer" for r in rows)


def test_dataset_is_deterministic_and_realistic():
    a = sap_mock.build_dataset(42, AS_OF)
    b = sap_mock.build_dataset(42, AS_OF)
    assert a == b
    assert sap_mock.build_dataset(7, AS_OF) != a
    assert len(a["Warehouses"]) == 6 and len(a["Items"]) == 48
    assert sum(1 for w in a["Warehouses"] if "U_Capacity" not in w) == 1  # one warehouse has no capacity
    assert {o["Status"] for o in a["SalesOpportunities"]} == {"sos_Open", "sos_Sold", "sos_Missed"}
    assert {p["CardType"] for p in a["BusinessPartners"]} == {"cCustomer", "cLid", "cSupplier"}


def test_drift_changes_records_with_todays_update_date(server):
    before = {o["SequentialNo"]: dict(o) for o in server.data["SalesOpportunities"]}
    changes = server.drift()
    assert changes["new_opportunities"] == 1 and changes["closed"] == 1
    touched = [o for o in server.data["SalesOpportunities"] if o["UpdateDate"] == AS_OF.isoformat() and before.get(o["SequentialNo"]) != o]
    assert touched
