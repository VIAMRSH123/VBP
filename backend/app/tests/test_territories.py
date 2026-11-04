from app.models.lead import Lead
from app.models.representative import Representative
from app.services.dashboard_service import get_territory_stats


def add_lead(db, number, territory, status="New", value=0.0, rep=""):
    lead = Lead(lead_number=number, company=f"Co {number}", territory=territory, status=status, deal_size_estimate=value, representative_id=rep)
    db.add(lead)
    db.commit()
    return lead


def test_groups_counts_and_open_value_by_territory(db):
    add_lead(db, "L-1", "Doha", "Negotiation", 100.0)
    add_lead(db, "L-2", "Doha", "Won", 50.0)
    add_lead(db, "L-3", "Doha", "Lost", 25.0)
    add_lead(db, "L-4", "Al Khor", "New", 30.0)

    by_name = {r["territory"]: r for r in get_territory_stats(db)}

    assert by_name["Doha"] == {"territory": "Doha", "leads": 3, "active": 1, "won": 1, "lost": 1, "pipeline_value": 100.0}
    assert by_name["Al Khor"]["pipeline_value"] == 30.0


def test_blank_territory_is_reported_as_unassigned_not_dropped(db):
    add_lead(db, "L-1", "", "New", 10.0)
    add_lead(db, "L-2", "  ", "New", 5.0)

    assert [(r["territory"], r["leads"]) for r in get_territory_stats(db)] == [("Unassigned", 2)]


def test_falls_back_to_the_assigned_reps_territory(db):
    rep = Representative(representative_code="REP-1", name="Sara", territory="Doha")
    db.add(rep)
    db.commit()
    add_lead(db, "L-1", "", "New", 10.0, rep=rep.id)
    add_lead(db, "L-2", "Al Khor", "New", 20.0, rep=rep.id)  # the lead's own territory still wins

    by_name = {r["territory"]: r["leads"] for r in get_territory_stats(db)}

    assert by_name == {"Doha": 1, "Al Khor": 1}


def test_biggest_pipeline_first(db):
    add_lead(db, "L-1", "Al Khor", "New", 10.0)
    add_lead(db, "L-2", "Doha", "New", 90.0)

    assert [r["territory"] for r in get_territory_stats(db)] == ["Doha", "Al Khor"]


def test_representative_scope_limits_the_numbers(db):
    add_lead(db, "L-1", "Doha", "New", 10.0, rep="rep-a")
    add_lead(db, "L-2", "Doha", "New", 99.0, rep="rep-b")

    assert get_territory_stats(db, "rep-a")[0]["pipeline_value"] == 10.0


def test_endpoint_and_lead_territory_filter(client, db, auth):
    add_lead(db, "L-1", "Doha", "New", 10.0)
    add_lead(db, "L-2", "Al Khor", "New", 20.0)
    add_lead(db, "L-3", "", "New", 30.0)
    headers = auth("administrator")

    body = client.get("/api/dashboard/territories", headers=headers).json()
    assert {r["territory"] for r in body["territories"]} == {"Doha", "Al Khor", "Unassigned"}

    doha = client.get("/api/leads", params={"territory": "Doha"}, headers=headers).json()
    assert [l["lead_number"] for l in doha["items"]] == ["L-1"]
    rep = Representative(representative_code="REP-9", name="Sara", territory="Doha")
    db.add(rep)
    db.commit()
    add_lead(db, "L-4", "", "New", 5.0, rep=rep.id)
    again = client.get("/api/leads", params={"territory": "Doha"}, headers=headers).json()
    assert sorted(l["lead_number"] for l in again["items"]) == ["L-1", "L-4"]
    blank = client.get("/api/leads", params={"territory": "Unassigned"}, headers=headers).json()
    assert [l["lead_number"] for l in blank["items"]] == ["L-3"]


def test_territories_requires_login(client):
    assert client.get("/api/dashboard/territories").status_code in (401, 403)
