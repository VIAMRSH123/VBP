from datetime import date, timedelta

import pytest

from app.config import get_settings
from app.models.config import Configuration
from app.services import sap_sync_service as sync
from app.services.warehouse_service import compute_network

TODAY = date(2026, 10, 7)
TODAY_ISO = TODAY.isoformat()


def stock(wh="WH01", group="Rice", in_stock=100.0, committed=0.0, ordered=0.0, minimum=0.0):
    return {"warehouse_code": wh, "item_group": group, "in_stock": in_stock, "committed": committed, "ordered": ordered, "min_stock": minimum}


def move(wh="WH01", direction="in", day=TODAY_ISO, entry=1, qty=10.0, who="Acme"):
    return {"warehouse_code": wh, "direction": direction, "doc_date": day, "doc_entry": entry, "quantity": qty, "counterparty": who}


WH = [{"code": "WH01", "name": "Hyderabad Hub", "city": "Hyderabad", "capacity": 1000.0}]


def network(rows, moves=(), warehouses=WH, overrides=None):
    return compute_network(warehouses, list(rows), list(moves), today=TODAY, capacity_overrides=overrides)


def test_totals_reserved_available_and_on_order():
    result = network([stock(in_stock=300, committed=50, ordered=40), stock(in_stock=100, committed=20, ordered=0)])
    wh = result["warehouses"][0]
    assert (wh["totalStock"], wh["reserved"], wh["available"], wh["onOrder"], wh["skuCount"]) == (400, 70, 330, 40, 2)
    assert wh["utilization"] == 40 and result["summary"]["averageUtilization"] == 40.0


def test_available_never_goes_negative():
    assert network([stock(in_stock=10, committed=50)])["warehouses"][0]["available"] == 0


@pytest.mark.parametrize(
    "in_stock,minimum,bucket",
    [(0, 100, "critical"), (49, 100, "critical"), (50, 100, "low"), (99, 100, "low"), (100, 100, "healthy"), (500, 100, "healthy"), (30, 0, "healthy")],
)
def test_stock_health_thresholds(in_stock, minimum, bucket):
    health = network([stock(in_stock=in_stock, minimum=minimum)])["warehouses"][0]["health"]
    assert health[bucket] == 100


def test_items_with_no_stock_and_no_minimum_are_ignored_and_health_sums_to_100():
    rows = [stock(in_stock=0, minimum=0)] + [stock(in_stock=100, minimum=10)] * 2 + [stock(in_stock=5, minimum=10), stock(in_stock=1, minimum=10)]
    wh = network(rows)["warehouses"][0]
    assert sum(wh["health"].values()) == 100
    assert wh["criticalAlerts"] == 1 and wh["status"] == "Warning"


def test_one_stocked_out_item_does_not_flag_the_whole_warehouse():
    rows = [stock(in_stock=100, minimum=10) for _ in range(19)] + [stock(in_stock=0, minimum=10)]
    wh = network(rows)["warehouses"][0]
    assert wh["criticalAlerts"] == 1 and wh["status"] == "Operational"  # 1 of 20 = 5%, below the 10% flag
    wh = network(rows[:18] + [stock(in_stock=0, minimum=10)] * 2)["warehouses"][0]
    assert wh["criticalAlerts"] == 2 and wh["status"] == "Warning"  # 2 of 20 = 10%


def test_status_is_operational_without_critical_items():
    assert network([stock(in_stock=100, minimum=10)])["warehouses"][0]["status"] == "Operational"


def test_capacity_prefers_the_sap_field_then_the_override_then_is_unknown():
    no_cap = [{"code": "WH01", "name": "A", "city": "", "capacity": None}]
    assert network([stock()], warehouses=no_cap)["warehouses"][0]["utilization"] is None
    assert network([stock()], warehouses=no_cap, overrides={"WH01": 400.0})["warehouses"][0]["utilization"] == 25
    assert network([stock()], overrides={"WH01": 400.0})["warehouses"][0]["capacity"] == 1000.0  # SAP field wins
    summary = network([stock()], warehouses=no_cap)["summary"]
    assert summary["averageUtilization"] is None


def test_average_utilization_is_capacity_weighted_over_warehouses_that_have_capacity():
    whs = [
        {"code": "A", "name": "A", "city": "", "capacity": 100.0},
        {"code": "B", "name": "B", "city": "", "capacity": 300.0},
        {"code": "C", "name": "C", "city": "", "capacity": None},
    ]
    rows = [stock("A", in_stock=100), stock("B", in_stock=100), stock("C", in_stock=999)]
    assert network(rows, warehouses=whs)["summary"]["averageUtilization"] == 50.0  # (100+100)/(100+300)


def test_inbound_and_outbound_count_only_todays_documents():
    moves = [
        move(direction="in", qty=100), move(direction="in", qty=50, entry=2),
        move(direction="out", qty=30, entry=3), move(direction="out", qty=999, day=(TODAY - timedelta(days=1)).isoformat(), entry=4),
        move(wh="OTHER", direction="in", qty=777, entry=5),
    ]
    wh = network([stock()], moves)["warehouses"][0]
    assert (wh["inbound"], wh["outbound"]) == (150, 30)


def test_breakdown_is_top_four_groups_plus_other_and_ignores_empty_stock():
    rows = [stock(group=g, in_stock=v) for g, v in (("A", 500), ("B", 400), ("C", 300), ("D", 200), ("E", 100), ("F", 50), ("G", 0))]
    breakdown = network(rows)["warehouses"][0]["breakdown"]
    assert [b["label"] for b in breakdown] == ["A", "B", "C", "D", "Other"]
    assert breakdown[-1]["units"] == 150


def test_activity_is_newest_first_limited_and_labelled():
    moves = [move(entry=i, day=(TODAY - timedelta(days=i)).isoformat(), qty=10 * i + 10, direction="out" if i % 2 else "in") for i in range(9)]
    activity = network([stock()], moves)["warehouses"][0]["activity"]
    assert len(activity) == 6
    assert activity[0]["time"] == "Today" and activity[0]["title"] == "Shipment received" and activity[0]["detail"].startswith("+10 units")
    assert activity[1]["time"] == "Yesterday" and activity[1]["title"] == "Order dispatched" and activity[1]["detail"].startswith("-20 units")


def test_warehouses_are_numbered_by_code_and_empty_input_is_safe():
    whs = [{"code": "B", "name": "B", "city": "", "capacity": 1.0}, {"code": "A", "name": "A", "city": "", "capacity": 1.0}]
    assert [(w["id"], w["number"]) for w in network([], warehouses=whs)["warehouses"]] == [("A", "01"), ("B", "02")]
    empty = network([], warehouses=[])
    assert empty["warehouses"] == [] and empty["summary"]["totalStock"] == 0 and empty["summary"]["averageUtilization"] is None


# --- API -------------------------------------------------------------------------------------


def test_sample_mode_serves_the_demo_dataset_flagged_as_sample(client, auth, monkeypatch):
    monkeypatch.setattr(get_settings(), "sap_mode", "off")
    body = client.get("/api/warehouses", headers=auth("executive")).json()
    assert body["source"] == {"mode": "sample", "last_synced_at": None}
    assert len(body["warehouses"]) == 6 and body["summary"]["warehouseCount"] == 6
    assert any(w["utilization"] is None for w in body["warehouses"])  # the warehouse without a capacity field
    assert any(w["status"] == "Warning" for w in body["warehouses"])


def test_synced_mode_serves_database_data_with_the_last_sync_time(db, client, auth, mock_sap):
    empty = client.get("/api/warehouses", headers=auth("administrator")).json()
    assert empty["warehouses"] == [] and empty["source"]["last_synced_at"] is None

    sync.run_sync(db)
    body = client.get("/api/warehouses", headers=auth("administrator")).json()
    assert body["source"]["mode"] == "mock" and body["source"]["last_synced_at"]
    assert len(body["warehouses"]) == 6
    assert body["summary"]["totalStock"] == sum(w["totalStock"] for w in body["warehouses"]) > 0


def test_capacity_can_be_overridden_per_warehouse_in_configuration(db, client, auth, mock_sap):
    sync.run_sync(db)
    db.add(Configuration(key="warehouse_capacity:WH05", value="50000"))
    db.commit()
    wh05 = next(w for w in client.get("/api/warehouses", headers=auth("administrator")).json()["warehouses"] if w["id"] == "WH05")
    assert wh05["capacity"] == 50000.0 and wh05["utilization"] is not None


@pytest.mark.parametrize("role,expected", [("administrator", 200), ("sales_manager", 200), ("executive", 200), ("read_only_auditor", 200), ("sales_representative", 403)])
def test_warehouse_endpoint_permissions(client, auth, role, expected):
    assert client.get("/api/warehouses", headers=auth(role)).status_code == expected


def test_warehouse_endpoint_requires_login(client):
    assert client.get("/api/warehouses").status_code == 401


def test_status_is_visible_to_everyone_but_errors_only_to_admins(db, client, auth, mock_sap):
    mock_sap.require_credentials = ("x", "x", "x")
    sync.run_sync(db)  # fails, leaving an error behind
    assert "last_error" not in client.get("/api/sap/status", headers=auth("sales_representative")).json()
    admin = client.get("/api/sap/status", headers=auth("administrator")).json()
    assert admin["mode"] == "mock" and admin["last_run"]["status"] == "failed" and "connection" in admin["last_error"]


def test_manual_sync_permissions_and_validation(db, client, auth, mock_sap):
    assert client.post("/api/sap/sync", headers=auth("sales_representative")).status_code == 403
    assert client.post("/api/sap/sync?mode=bogus", headers=auth("administrator")).status_code == 422
    assert client.post("/api/sap/sync?mode=backfill", headers=auth("sales_manager")).status_code == 403

    response = client.post("/api/sap/sync", headers=auth("sales_manager"))
    assert response.status_code == 202 and response.json()["accepted"] is True
    status = client.get("/api/sap/status", headers=auth("sales_manager")).json()
    assert status["last_run"]["status"] == "success" and status["last_run"]["triggered_by"] == "sales_manager@test.local"

    assert client.post("/api/sap/sync?mode=backfill", headers=auth("administrator")).status_code == 202


def test_manual_sync_is_rejected_when_off_or_already_running(db, client, auth, mock_sap, monkeypatch):
    assert sync._RUN_LOCK.acquire(blocking=False)
    try:
        assert client.post("/api/sap/sync", headers=auth("administrator")).status_code == 409
    finally:
        sync._RUN_LOCK.release()
    monkeypatch.setattr(get_settings(), "sap_mode", "off")
    assert client.post("/api/sap/sync", headers=auth("administrator")).status_code == 400


def test_purge_mock_is_admin_only(db, client, auth, mock_sap):
    sync.run_sync(db)
    assert client.post("/api/sap/purge-mock", headers=auth("sales_manager")).status_code == 403
    response = client.post("/api/sap/purge-mock", headers=auth("administrator"))
    assert response.status_code == 200 and response.json()["removed"]["warehouses"] == 6
    assert client.get("/api/warehouses", headers=auth("administrator")).json()["warehouses"] == []


def test_runs_listing_is_admin_only_and_includes_errors(db, client, auth, mock_sap):
    sync.run_sync(db)
    assert client.get("/api/sap/runs", headers=auth("sales_manager")).status_code == 403
    runs = client.get("/api/sap/runs", headers=auth("administrator")).json()
    assert runs[0]["status"] == "success" and "error_details" in runs[0]
