"""SAP master, stock and document sync into the Silver tables.

Each function reads one SAP entity through `SapSession` and upserts idempotently: unchanged rows are
detected and left alone, so re-running a sync (or overlapping a day of incremental history) is safe.
"""
import logging
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.integrations.sap_client import SapSession
from app.integrations.sap_entities import ENTITIES, date_filter
from app.models.inventory import StockLevel, StockMovement, Warehouse
from app.models.lead import Customer, Product
from app.models.representative import Representative
from app.models.sap import SapDocument, SapLookup
from app.services.sap_mapper import normalize_phone, to_float, utc_now_iso

logger = logging.getLogger("sap.masters")

COUNT_KEYS = ("fetched", "created", "updated", "unchanged", "failed")
MOVEMENT_RETENTION_DAYS = 90


def bump(counts: dict, entity: str, key: str, amount: int = 1) -> None:
    counts.setdefault(entity, dict.fromkeys(COUNT_KEYS, 0))[key] += amount


def _incremental_filter(entity: str, sap: SapSession, since: date | None) -> str | None:
    spec = ENTITIES[entity]
    if since is None or not spec.date_field:
        return None
    return date_filter(spec.date_field, since, sap.version)


def lookup_map(db: Session, ext: str, kind: str) -> dict[str, str]:
    rows = db.query(SapLookup).filter(SapLookup.external_system == ext, SapLookup.kind == kind).all()
    return {r.code: r.name for r in rows}


def stage_percentages(db: Session, ext: str) -> dict[str, float]:
    rows = db.query(SapLookup).filter(SapLookup.external_system == ext, SapLookup.kind == "sales_stage").all()
    return {r.code: to_float(r.extra) for r in rows}


# --- lookups ---------------------------------------------------------------------------------

_LOOKUPS = (
    ("ItemGroups", "item_group", "Number", "GroupName"),
    ("Territories", "territory", "TerritoryID", "Description"),
    ("Industries", "industry", "IndustryCode", "IndustryName"),
    ("SalesStages", "sales_stage", "SequenceNo", "Name"),
)


def sync_lookups(db: Session, sap: SapSession, ext: str, counts: dict) -> None:
    for entity, kind, key_field, name_field in _LOOKUPS:
        existing = {r.code: r for r in db.query(SapLookup).filter(SapLookup.external_system == ext, SapLookup.kind == kind)}
        for row in sap.fetch_all(entity):
            bump(counts, entity, "fetched")
            code, name = str(row.get(key_field)), str(row.get(name_field) or "")
            extra = str(row.get("ClosingPercentage") or "")
            current = existing.get(code)
            if current is None:
                db.add(SapLookup(external_system=ext, kind=kind, code=code, name=name, extra=extra))
                bump(counts, entity, "created")
            elif (current.name, current.extra) != (name, extra):
                current.name, current.extra = name, extra
                bump(counts, entity, "updated")
            else:
                bump(counts, entity, "unchanged")
        db.commit()


# --- warehouses ------------------------------------------------------------------------------


def sync_warehouses(db: Session, sap: SapSession, ext: str, counts: dict, capacity_field: str) -> None:
    existing = {w.code: w for w in db.query(Warehouse).filter(Warehouse.external_system == ext)}
    seen: set[str] = set()
    for row in sap.fetch_all("Warehouses"):
        bump(counts, "Warehouses", "fetched")
        code = str(row["WarehouseCode"])
        seen.add(code)
        capacity = to_float(row.get(capacity_field), default=0.0) or None
        values = {
            "name": row.get("WarehouseName") or code,
            "city": row.get("City") or "",
            "capacity": capacity,
            "active_flag": row.get("Inactive") != "tYES",
        }
        warehouse = existing.get(code)
        if warehouse is None:
            db.add(Warehouse(external_system=ext, code=code, **values))
            bump(counts, "Warehouses", "created")
        elif any(getattr(warehouse, k) != v for k, v in values.items()):
            for k, v in values.items():
                setattr(warehouse, k, v)
            bump(counts, "Warehouses", "updated")
        else:
            bump(counts, "Warehouses", "unchanged")
    for code, warehouse in existing.items():
        if code not in seen and warehouse.active_flag:
            warehouse.active_flag = False  # removed in SAP
    db.commit()


# --- sales people -> representatives ---------------------------------------------------------


def sync_sales_persons(db: Session, sap: SapSession, ext: str, counts: dict, default_country_code: str) -> None:
    linked = {r.external_id: r for r in db.query(Representative).filter(Representative.external_system == ext, Representative.external_id != "")}
    unlinked = [r for r in db.query(Representative).filter(Representative.external_id == "")]
    by_email = {r.email.strip().lower(): r for r in unlinked if r.email}
    by_name = {r.name.strip().lower(): r for r in unlinked}

    for row in sap.fetch_all("SalesPersons"):
        code = int(row.get("SalesEmployeeCode", -1))
        if code <= 0:  # -1 is SAP's built-in "no sales employee"
            continue
        bump(counts, "SalesPersons", "fetched")
        key = str(code)
        name = row.get("SalesEmployeeName") or f"Sales person {code}"
        email = (row.get("Email") or "").strip()
        phone = normalize_phone(row.get("Mobile") or row.get("Telephone"), default_country_code)
        active = row.get("Active") != "tNO"

        rep = linked.get(key)
        if rep is None:
            # Adopt a rep from the uploaded roster (same email, else same name) instead of duplicating them.
            rep = by_email.get(email.lower()) if email else None
            rep = rep or by_name.get(name.strip().lower())
            if rep is not None:
                rep.external_system, rep.external_id = ext, key
                linked[key] = rep
        if rep is None:
            rep = Representative(
                representative_code=f"SAP-{code}",
                name=name,
                email=email,
                phone=phone,
                active=active,
                external_system=ext,
                external_id=key,
                profile_source="sap_derived",
            )
            db.add(rep)
            linked[key] = rep
            bump(counts, "SalesPersons", "created")
            continue

        changed = False
        # SAP owns identity fields; roster-only fields (territory, language, category) are never overwritten.
        for attr, value in (("name", name), ("email", email), ("phone", phone)):
            if value and getattr(rep, attr) != value:
                setattr(rep, attr, value)
                changed = True
        if rep.active != active:
            rep.active, changed = active, True
        bump(counts, "SalesPersons", "updated" if changed else "unchanged")
    db.commit()


# --- items, products and the stock snapshot ---------------------------------------------------


def sync_items_and_stock(db: Session, sap: SapSession, ext: str, counts: dict) -> None:
    groups = lookup_map(db, ext, "item_group")
    products = {p.item_code: p for p in db.query(Product).filter(Product.external_system == ext, Product.item_code != "")}
    taken_names = {name for (name,) in db.query(Product.name)}
    stock = {(s.warehouse_code, s.item_code): s for s in db.query(StockLevel).filter(StockLevel.external_system == ext)}
    stamp = utc_now_iso()

    for item in sap.fetch_all("Items", select=ENTITIES["Items"].select):
        bump(counts, "Items", "fetched")
        code = str(item["ItemCode"])
        name = item.get("ItemName") or code
        group = groups.get(str(item.get("ItemsGroupCode")), "")

        product = products.get(code)
        if product is None:
            unique_name = name if name not in taken_names else f"{name} [{code}]"
            product = Product(name=unique_name, category=group, external_system=ext, item_code=code, item_group=group)
            db.add(product)
            products[code] = product
            taken_names.add(unique_name)
            bump(counts, "Items", "created")
        elif (product.category, product.item_group) != (group, group):
            product.category = product.item_group = group
            bump(counts, "Items", "updated")
        else:
            bump(counts, "Items", "unchanged")

        for info in item.get("ItemWarehouseInfoCollection") or []:
            wh = str(info.get("WarehouseCode"))
            values = {
                "item_name": name,
                "item_group": group,
                "in_stock": to_float(info.get("InStock")),
                "committed": to_float(info.get("Committed")),
                "ordered": to_float(info.get("Ordered")),
                "min_stock": to_float(info.get("MinimalStock")),
                "synced_at": stamp,
            }
            level = stock.get((wh, code))
            if level is None:
                level = StockLevel(external_system=ext, warehouse_code=wh, item_code=code, **values)
                db.add(level)
                stock[(wh, code)] = level
            else:
                for k, v in values.items():
                    setattr(level, k, v)
    db.flush()
    # Stock is always a full snapshot: anything not seen this run no longer exists in SAP.
    db.query(StockLevel).filter(StockLevel.external_system == ext, StockLevel.synced_at != stamp).delete(synchronize_session=False)
    db.commit()


# --- business partners -> customers ----------------------------------------------------------


def sync_partners(db: Session, sap: SapSession, ext: str, counts: dict, since: date | None, default_country_code: str) -> list[dict]:
    """Upserts customers and leads (never suppliers). Returns the raw rows of changed `cLid` partners."""
    territories = lookup_map(db, ext, "territory")
    industries = lookup_map(db, ext, "industry")
    existing = {c.external_id: c for c in db.query(Customer).filter(Customer.external_system == ext, Customer.external_id != "")}
    changed_leads: list[dict] = []

    rows = sap.fetch_all("BusinessPartners", select=ENTITIES["BusinessPartners"].select, filter=_incremental_filter("BusinessPartners", sap, since))
    for row in rows:
        card_type = row.get("CardType")
        if card_type not in ("cCustomer", "cLid"):
            continue
        bump(counts, "BusinessPartners", "fetched")
        code = str(row["CardCode"])
        values = {
            "company": row.get("CardName") or code,
            "contact_name": row.get("ContactPerson") or "",
            "phone": normalize_phone(row.get("Cellular") or row.get("Phone1"), default_country_code),
            "email": row.get("EmailAddress") or "",
            "industry": industries.get(str(row.get("Industry")), ""),
            "territory": territories.get(str(row.get("Territory")), row.get("City") or ""),
            "card_type": card_type,
            "customer_type": "Existing" if card_type == "cCustomer" else "New",
        }
        customer = existing.get(code)
        if customer is None:
            db.add(Customer(external_system=ext, external_id=code, **values))
            bump(counts, "BusinessPartners", "created")
        elif any(getattr(customer, k) != v for k, v in values.items()):
            for k, v in values.items():
                setattr(customer, k, v)
            bump(counts, "BusinessPartners", "updated")
        else:
            bump(counts, "BusinessPartners", "unchanged")
        if card_type == "cLid":
            changed_leads.append(row)
    db.commit()
    return changed_leads


# --- quotations and orders -------------------------------------------------------------------


def sync_documents(db: Session, sap: SapSession, ext: str, counts: dict, since: date | None) -> set[str]:
    """Upserts quotations/orders into `sap_documents`. Returns the card codes whose documents changed."""
    item_groups = {code: group for code, group in db.query(Product.item_code, Product.item_group).filter(Product.item_code != "")}
    changed_cards: set[str] = set()

    for entity, doc_type in (("Quotations", "quotation"), ("Orders", "order")):
        existing = {d.doc_entry: d for d in db.query(SapDocument).filter(SapDocument.external_system == ext, SapDocument.doc_type == doc_type)}
        for row in sap.fetch_all(entity, filter=_incremental_filter(entity, sap, since)):
            bump(counts, entity, "fetched")
            lines = row.get("DocumentLines") or []
            first = lines[0] if lines else {}
            values = {
                "doc_num": int(row.get("DocNum") or 0),
                "card_code": row.get("CardCode") or "",
                "doc_date": row.get("DocDate") or "",
                "doc_due_date": row.get("DocDueDate") or "",
                "doc_total": to_float(row.get("DocTotal")),
                "vat_sum": to_float(row.get("VatSum")),
                "currency": row.get("DocCurrency") or "",
                "doc_status": row.get("DocumentStatus") or "",
                "cancelled": row.get("Cancelled") == "tYES",
                "sales_person_code": int(row.get("SalesPersonCode", -1)),
                "top_item_code": first.get("ItemCode") or "",
                "top_item_name": first.get("ItemDescription") or "",
                "top_item_group": item_groups.get(first.get("ItemCode"), ""),
                "quantity_total": sum(to_float(line.get("Quantity")) for line in lines),
                "update_date": row.get("UpdateDate") or "",
            }
            entry = int(row["DocEntry"])
            document = existing.get(entry)
            if document is None:
                db.add(SapDocument(external_system=ext, doc_type=doc_type, doc_entry=entry, **values))
                bump(counts, entity, "created")
            elif any(getattr(document, k) != v for k, v in values.items()):
                for k, v in values.items():
                    setattr(document, k, v)
                bump(counts, entity, "updated")
            else:
                bump(counts, entity, "unchanged")
                continue
            changed_cards.add(values["card_code"])
        db.commit()
    return changed_cards


def refresh_customer_order_stats(db: Session, ext: str, card_codes: set[str]) -> None:
    for code in card_codes:
        count, latest = (
            db.query(func.count(SapDocument.id), func.max(SapDocument.doc_date))
            .filter(
                SapDocument.external_system == ext,
                SapDocument.doc_type == "order",
                SapDocument.card_code == code,
                SapDocument.cancelled == False,  # noqa: E712
            )
            .one()
        )
        customer = db.query(Customer).filter(Customer.external_system == ext, Customer.external_id == code).first()
        if customer:
            customer.order_count, customer.last_order_date = int(count or 0), latest or ""
    db.commit()


# --- stock movements -------------------------------------------------------------------------

_MOVEMENTS = (("DeliveryNotes", "delivery", "out"), ("PurchaseDeliveryNotes", "goods_receipt", "in"))


def sync_movements(db: Session, sap: SapSession, ext: str, counts: dict, since: date | None, backfill_days: int = 60) -> None:
    window_start = since or (date.today() - timedelta(days=backfill_days))
    for entity, doc_type, direction in _MOVEMENTS:
        existing = {
            (m.doc_entry, m.line_num): m
            for m in db.query(StockMovement).filter(
                StockMovement.external_system == ext, StockMovement.doc_type == doc_type, StockMovement.doc_date >= window_start.isoformat()
            )
        }
        for row in sap.fetch_all(entity, filter=_incremental_filter(entity, sap, window_start)):
            bump(counts, entity, "fetched")
            if row.get("Cancelled") == "tYES":
                continue
            entry = int(row["DocEntry"])
            for index, line in enumerate(row.get("DocumentLines") or []):
                number = int(line.get("LineNum", index))
                values = {
                    "doc_num": int(row.get("DocNum") or 0),
                    "doc_date": row.get("DocDate") or "",
                    "warehouse_code": str(line.get("WarehouseCode") or ""),
                    "item_code": line.get("ItemCode") or "",
                    "item_name": line.get("ItemDescription") or "",
                    "quantity": to_float(line.get("Quantity")),
                    "direction": direction,
                    "counterparty": row.get("CardName") or "",
                }
                movement = existing.get((entry, number))
                if movement is None:
                    db.add(StockMovement(external_system=ext, doc_type=doc_type, doc_entry=entry, line_num=number, **values))
                    bump(counts, entity, "created")
                elif any(getattr(movement, k) != v for k, v in values.items()):
                    for k, v in values.items():
                        setattr(movement, k, v)
                    bump(counts, entity, "updated")
                else:
                    bump(counts, entity, "unchanged")
        db.commit()

    cutoff = (date.today() - timedelta(days=MOVEMENT_RETENTION_DAYS)).isoformat()
    db.query(StockMovement).filter(StockMovement.external_system == ext, StockMovement.doc_date < cutoff).delete(synchronize_session=False)
    db.commit()

