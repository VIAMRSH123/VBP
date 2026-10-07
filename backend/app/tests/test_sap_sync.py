import json

import pytest

from app.config import get_settings
from app.models.inventory import StockLevel, StockMovement, Warehouse
from app.models.lead import Customer, Product
from app.models.representative import Representative
from app.models.sap import SapDocument, SapLookup, SapSyncRun, SapSyncState
from app.services import sap_sync_service as sync

EXT = "sap_b1_mock"


def counts_of(run: SapSyncRun) -> dict:
    return json.loads(run.counts)


def test_first_run_is_a_backfill_that_loads_masters_stock_documents_and_movements(db, mock_sap):
    run = sync.run_sync(db, triggered_by="test")
    counts = counts_of(run)

    assert run.status == "success" and run.mode == "backfill" and run.error_details == ""
    assert counts["Warehouses"]["created"] == 6
    assert counts["Items"]["created"] == 48 == db.query(Product).filter(Product.external_system == EXT).count()
    expected_rows = sum(len(i["ItemWarehouseInfoCollection"]) for i in mock_sap.data["Items"])
    assert db.query(StockLevel).count() == expected_rows
    # customers and leads are stored, suppliers are not
    assert db.query(Customer).filter(Customer.external_system == EXT).count() == 34
    assert db.query(Customer).filter(Customer.card_type == "cSupplier").count() == 0
    assert db.query(SapDocument).filter(SapDocument.doc_type == "order").count() == len(mock_sap.data["Orders"])
    assert db.query(SapDocument).filter(SapDocument.doc_type == "quotation").count() == len(mock_sap.data["Quotations"])
    assert db.query(StockMovement).filter(StockMovement.direction == "out").count() > 0
    assert db.query(SapLookup).filter(SapLookup.kind == "territory").count() == 6
    assert db.query(SapSyncState).filter(SapSyncState.entity == "BusinessPartners").one().cursor_date


def test_warehouse_capacity_comes_from_the_configured_custom_field(db, mock_sap):
    sync.run_sync(db)
    capacities = {w.code: w.capacity for w in db.query(Warehouse)}
    assert capacities["WH01"] == 71000.0 and capacities["WH05"] is None  # WH05 has no UDF on purpose


def test_second_run_is_incremental_and_creates_no_duplicates(db, mock_sap):
    sync.run_sync(db)
    stock_rows, movement_rows = db.query(StockLevel).count(), db.query(StockMovement).count()

    run = sync.run_sync(db)
    counts = counts_of(run)

    assert run.mode == "incremental" and run.status == "success"
    for entity in ("Warehouses", "Items", "BusinessPartners", "Orders", "Quotations"):
        assert counts[entity]["created"] == 0 and counts[entity]["updated"] == 0, entity
    assert db.query(StockLevel).count() == stock_rows
    assert db.query(StockMovement).count() == movement_rows
    assert db.query(Warehouse).count() == 6


def test_incremental_run_picks_up_new_sap_activity(db, mock_sap):
    sync.run_sync(db)
    orders_before = db.query(SapDocument).filter(SapDocument.doc_type == "order").count()
    movements_before = db.query(StockMovement).count()

    changes = mock_sap.drift()
    run = sync.run_sync(db)

    assert changes["new_orders"] == 1
    assert db.query(SapDocument).filter(SapDocument.doc_type == "order").count() == orders_before + 1
    assert db.query(StockMovement).count() == movements_before + 2  # one delivery + one goods receipt line
    assert counts_of(run)["Orders"]["created"] == 1


def test_stock_snapshot_removes_items_that_disappeared_from_sap(db, mock_sap):
    sync.run_sync(db)
    removed_item = mock_sap.data["Items"].pop(0)
    sync.run_sync(db)
    assert db.query(StockLevel).filter(StockLevel.item_code == removed_item["ItemCode"]).count() == 0


def test_a_failing_entity_makes_the_run_partial_without_blocking_the_others(db, mock_sap):
    del mock_sap.data["Territories"]  # SAP answers 404 for this entity
    run = sync.run_sync(db)

    assert run.status == "partial" and "lookups" in run.error_details
    assert db.query(Warehouse).count() == 6 and db.query(StockLevel).count() > 0
    assert db.query(SapSyncState).filter(SapSyncState.entity == "BusinessPartners").count() == 1


def test_connection_failure_fails_the_run_and_sets_no_cursor(db, mock_sap):
    mock_sap.require_credentials = ("other-db", "other", "other")
    run = sync.run_sync(db)
    assert run.status == "failed" and "connection" in run.error_details
    assert db.query(SapSyncState).count() == 0
    assert db.query(Warehouse).count() == 0


def test_sync_refuses_to_start_while_another_is_running(db, mock_sap):
    assert sync._RUN_LOCK.acquire(blocking=False)
    try:
        with pytest.raises(sync.SyncAlreadyRunning):
            sync.run_sync(db)
    finally:
        sync._RUN_LOCK.release()

    db.add(SapSyncRun(external_system=EXT, status="running", started_at=sync.utc_now_iso()))
    db.commit()
    with pytest.raises(sync.SyncAlreadyRunning):
        sync.run_sync(db)


def test_an_abandoned_running_row_is_failed_after_the_stale_window(db, mock_sap):
    db.add(SapSyncRun(external_system=EXT, status="running", started_at="2020-01-01T00:00:00+00:00"))
    db.commit()
    run = sync.run_sync(db)
    assert run.status == "success"
    assert db.query(SapSyncRun).filter(SapSyncRun.status == "failed").count() == 1


def test_sync_is_blocked_when_sap_mode_is_off(db, mock_sap, monkeypatch):
    monkeypatch.setattr(get_settings(), "sap_mode", "off")
    with pytest.raises(sync.SapNotEnabled):
        sync.run_sync(db)


def test_live_mode_needs_credentials_and_refuses_while_mock_data_exists(db, mock_sap, monkeypatch):
    sync.run_sync(db)  # leaves mock data behind
    settings = get_settings()
    monkeypatch.setattr(settings, "sap_mode", "live")
    with pytest.raises(sync.SapNotEnabled, match="SAP_BASE_URL"):
        sync.preflight(db)

    for field, value in (("sap_base_url", "https://sap:50000/b1s/v1"), ("sap_company_db", "db"), ("sap_username", "u"), ("sap_password", "p")):
        monkeypatch.setattr(settings, field, value)
    with pytest.raises(sync.MockDataPresent):
        sync.preflight(db)
    assert sync.get_status(db)["needs_reset"] is True

    sync.purge_mock_data(db)
    assert sync.preflight(db) is settings
    assert sync.get_status(db)["needs_reset"] is False


def test_sales_persons_adopt_roster_reps_by_email_or_name_and_keep_roster_fields(db, mock_sap):
    db.add_all([
        Representative(representative_code="REP-010", name="Someone Else", email="ravikumar@tfs.example", territory="Hyderabad", language="Telugu", phone="+911111111111"),
        Representative(representative_code="REP-011", name="Anitha Reddy", territory="Warangal", product_category="Pulses", language="Telugu"),
    ])
    db.commit()
    sync.run_sync(db)

    by_code = {r.representative_code: r for r in db.query(Representative)}
    by_email, by_name = by_code["REP-010"], by_code["REP-011"]
    assert by_email.external_id == "1" and by_email.external_system == EXT
    assert by_email.name == "Ravi Kumar" and by_email.phone == "+919848011101"  # SAP owns identity fields
    assert by_email.territory == "Hyderabad" and by_email.language == "Telugu"  # roster owns the rest
    assert by_name.external_id == "2" and by_name.territory == "Warangal" and by_name.product_category == "Pulses"
    created = db.query(Representative).filter(Representative.profile_source == "sap_derived").all()
    assert len(created) == 4 and all(r.representative_code.startswith("SAP-") for r in created)
    assert db.query(Representative).filter(Representative.external_id == "-1").count() == 0  # "no sales employee" skipped


def test_purge_removes_mock_data_but_keeps_roster_reps(db, mock_sap):
    db.add(Representative(representative_code="REP-010", name="Ravi Kumar", email="ravikumar@tfs.example"))
    db.commit()
    sync.run_sync(db)
    removed = sync.purge_mock_data(db)

    assert removed["warehouses"] == 6 and removed["stock_levels"] > 0
    for model in (Warehouse, StockLevel, StockMovement, Customer, SapDocument, SapSyncRun, SapSyncState):
        assert db.query(model).count() == 0, model
    rep = db.query(Representative).one()
    assert rep.representative_code == "REP-010" and rep.external_id == "" and rep.external_system == ""
    assert not sync.has_mock_data(db)


def test_customers_carry_territory_industry_phone_and_order_stats(db, mock_sap):
    sync.run_sync(db)
    customer = db.query(Customer).filter(Customer.external_system == EXT, Customer.card_type == "cCustomer").first()
    assert customer.territory in ("Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Nalgonda")
    assert customer.industry and customer.phone.startswith("+91") and customer.customer_type == "Existing"
    with_orders = db.query(Customer).filter(Customer.order_count > 0).count()
    assert with_orders > 0
    lead = db.query(Customer).filter(Customer.card_type == "cLid").first()
    assert lead.customer_type == "New"
