from sqlalchemy import inspect

from app.db import _evolve_schema, engine


def test_evolve_schema_adds_missing_column_and_index_and_is_idempotent(db):
    with engine.begin() as conn:
        conn.exec_driver_sql("DROP INDEX uq_leads_external")
        conn.exec_driver_sql("ALTER TABLE leads DROP COLUMN sap_hash")
    assert "sap_hash" not in {c["name"] for c in inspect(engine).get_columns("leads")}

    _evolve_schema(engine)
    _evolve_schema(engine)  # second run must be a no-op

    assert "sap_hash" in {c["name"] for c in inspect(engine).get_columns("leads")}
    assert "uq_leads_external" in {i["name"] for i in inspect(engine).get_indexes("leads")}


def test_new_columns_default_to_empty_for_existing_rows(db):
    from app.models.lead import Lead

    db.add(Lead(lead_number="L-1", company="Acme"))
    db.commit()
    row = db.query(Lead).one()
    assert row.external_system == "" and row.external_id == "" and row.sap_refs == ""


def test_partial_unique_index_ignores_blank_external_ids_but_blocks_duplicates(db):
    import pytest
    from sqlalchemy.exc import IntegrityError

    from app.models.lead import Lead

    db.add_all([Lead(lead_number="L-1", company="A"), Lead(lead_number="L-2", company="B")])
    db.commit()  # two blank external ids are fine

    db.add_all(
        [
            Lead(lead_number="L-3", company="C", external_system="sap_b1", external_id="opp:1"),
            Lead(lead_number="L-4", company="D", external_system="sap_b1", external_id="opp:1"),
        ]
    )
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
