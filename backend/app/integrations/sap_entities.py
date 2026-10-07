"""Single registry of SAP Business One Service Layer entity and field names.

Everything the sync reads from SAP is named here, so after a real `$metadata` check against the
customer's server (see scripts/sap_probe.py) only this file should need editing. Field names come
from the public Service Layer documentation, not from a live system.
"""
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class EntitySpec:
    name: str  # Service Layer entity set, e.g. "BusinessPartners"
    key: str  # primary-key field
    date_field: str = ""  # incremental-sync field ("" = always fetched in full)
    select: tuple[str, ...] = ()  # empty = let SAP return every field (needed for user-defined fields)


ENTITIES: dict[str, EntitySpec] = {
    "Warehouses": EntitySpec("Warehouses", "WarehouseCode"),
    "ItemGroups": EntitySpec("ItemGroups", "Number"),
    "Items": EntitySpec(
        "Items",
        "ItemCode",
        date_field="UpdateDate",
        select=("ItemCode", "ItemName", "ItemsGroupCode", "ItemWarehouseInfoCollection", "UpdateDate"),
    ),
    "SalesPersons": EntitySpec("SalesPersons", "SalesEmployeeCode"),
    "Territories": EntitySpec("Territories", "TerritoryID"),
    "Industries": EntitySpec("Industries", "IndustryCode"),
    "SalesStages": EntitySpec("SalesStages", "SequenceNo"),
    "BusinessPartners": EntitySpec(
        "BusinessPartners",
        "CardCode",
        date_field="UpdateDate",
        select=(
            "CardCode",
            "CardName",
            "CardType",
            "Phone1",
            "Cellular",
            "EmailAddress",
            "ContactPerson",
            "City",
            "Territory",
            "Industry",
            "SalesPersonCode",
            "Currency",
            "UpdateDate",
        ),
    ),
    "SalesOpportunities": EntitySpec("SalesOpportunities", "SequentialNo", date_field="UpdateDate"),
    "Quotations": EntitySpec("Quotations", "DocEntry", date_field="UpdateDate"),
    "Orders": EntitySpec("Orders", "DocEntry", date_field="UpdateDate"),
    "DeliveryNotes": EntitySpec("DeliveryNotes", "DocEntry", date_field="UpdateDate"),
    "PurchaseDeliveryNotes": EntitySpec("PurchaseDeliveryNotes", "DocEntry", date_field="UpdateDate"),
}


def api_version_from_url(base_url: str) -> str:
    """`v2` (OData v4) when the URL says so, otherwise `v1` (OData v3)."""
    return "v2" if "/b1s/v2" in base_url.lower() else "v1"


def odata_date_literal(value: date, version: str) -> str:
    """v1 (OData v3) wants a quoted date string, v2 (OData v4) a bare date."""
    iso = value.isoformat()
    return iso if version == "v2" else f"'{iso}'"


def date_filter(field: str, since: date, version: str) -> str:
    return f"{field} ge {odata_date_literal(since, version)}"
