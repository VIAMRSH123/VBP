"""Warehouse/inventory view built from the synced SAP stock snapshot and recent movements.

The same pure calculation (`compute_network`) serves three inputs: the database when SAP sync is on, and
the built-in mock dataset when it is off (flagged "sample"), so the page always renders consistently.
Aggregation is done in Python over compact rows: even a large item master is a few tens of thousands of
tuples, and keeping one code path is worth more here than SQL-level grouping.
"""
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.config import Configuration
from app.models.inventory import StockLevel, StockMovement, Warehouse
from app.models.sap import SapSyncRun

CRITICAL_RATIO = 0.5  # below half of the minimum stock is critical
WARNING_CRITICAL_SHARE = 0.10  # a warehouse is flagged once 10% of its tracked items are critical
ACTIVITY_LIMIT = 6
BREAKDOWN_TOP = 4


def _largest_remainder(counts: dict[str, int]) -> dict[str, int]:
    """Percentages that always add up to exactly 100."""
    total = sum(counts.values())
    if total == 0:
        return dict.fromkeys(counts, 0)
    raw = {k: v * 100 / total for k, v in counts.items()}
    floors = {k: int(v) for k, v in raw.items()}
    leftover = 100 - sum(floors.values())
    for key in sorted(raw, key=lambda k: raw[k] - floors[k], reverse=True)[:leftover]:
        floors[key] += 1
    return floors


def _label_for(day: str, today: date) -> str:
    try:
        parsed = date.fromisoformat(day)
    except ValueError:
        return day
    if parsed == today:
        return "Today"
    if parsed == today - timedelta(days=1):
        return "Yesterday"
    return parsed.strftime("%d %b")


def _classify(in_stock: float, minimum: float) -> str | None:
    if minimum > 0:
        if in_stock <= 0 or in_stock < CRITICAL_RATIO * minimum:
            return "critical"
        return "low" if in_stock < minimum else "healthy"
    return "healthy" if in_stock > 0 else None  # no minimum set and nothing in stock: not meaningful


def compute_network(
    warehouses: list[dict],
    stock: list[dict],
    movements: list[dict],
    *,
    today: date,
    capacity_overrides: dict[str, float] | None = None,
) -> dict:
    overrides = capacity_overrides or {}
    stock_by_wh: dict[str, list[dict]] = defaultdict(list)
    for row in stock:
        stock_by_wh[row["warehouse_code"]].append(row)
    moves_by_wh: dict[str, list[dict]] = defaultdict(list)
    for move in movements:
        moves_by_wh[move["warehouse_code"]].append(move)

    result = []
    for index, wh in enumerate(sorted(warehouses, key=lambda w: w["code"]), start=1):
        rows = stock_by_wh.get(wh["code"], [])
        total = sum(r["in_stock"] for r in rows)
        reserved = sum(r["committed"] for r in rows)
        on_order = sum(r["ordered"] for r in rows)
        capacity = wh.get("capacity") or overrides.get(wh["code"]) or None

        health_counts = {"healthy": 0, "low": 0, "critical": 0}
        for r in rows:
            bucket = _classify(r["in_stock"], r["min_stock"])
            if bucket:
                health_counts[bucket] += 1
        by_group: dict[str, float] = defaultdict(float)
        for r in rows:
            if r["in_stock"] > 0:
                by_group[r["item_group"] or "Other"] += r["in_stock"]
        ranked = sorted(by_group.items(), key=lambda kv: kv[1], reverse=True)
        breakdown = [{"label": k, "units": round(v)} for k, v in ranked[:BREAKDOWN_TOP]]
        rest = sum(v for _, v in ranked[BREAKDOWN_TOP:])
        if rest > 0:
            breakdown.append({"label": "Other", "units": round(rest)})

        moves = moves_by_wh.get(wh["code"], [])
        today_iso = today.isoformat()
        inbound = sum(m["quantity"] for m in moves if m["direction"] == "in" and m["doc_date"] == today_iso)
        outbound = sum(m["quantity"] for m in moves if m["direction"] == "out" and m["doc_date"] == today_iso)
        recent = sorted(moves, key=lambda m: (m["doc_date"], m["doc_entry"]), reverse=True)[:ACTIVITY_LIMIT]
        activity = [
            {
                "time": _label_for(m["doc_date"], today),
                "title": "Shipment received" if m["direction"] == "in" else "Order dispatched",
                "detail": f"{'+' if m['direction'] == 'in' else '-'}{m['quantity']:,.0f} units"
                + (f" · {m['counterparty']}" if m.get("counterparty") else ""),
            }
            for m in recent
        ]

        critical = health_counts["critical"]
        tracked = sum(health_counts.values())
        under_strain = critical > 0 and critical / tracked >= WARNING_CRITICAL_SHARE
        result.append(
            {
                "id": wh["code"],
                "number": f"{index:02d}",
                "name": wh["name"],
                "location": wh.get("city") or "",
                "status": "Warning" if under_strain else "Operational",
                "capacity": capacity,
                "totalStock": round(total),
                "utilization": round(total * 100 / capacity) if capacity else None,
                "skuCount": sum(1 for r in rows if r["in_stock"] > 0),
                "inbound": round(inbound),
                "outbound": round(outbound),
                "reserved": round(reserved),
                "onOrder": round(on_order),
                "available": max(0, round(total - reserved)),
                "criticalAlerts": critical,
                "breakdown": breakdown,
                "health": _largest_remainder(health_counts),
                "activity": activity,
            }
        )

    with_capacity = [w for w in result if w["capacity"]]
    capacity_sum = sum(w["capacity"] for w in with_capacity)
    summary = {
        "warehouseCount": len(result),
        "totalStock": sum(w["totalStock"] for w in result),
        "averageUtilization": round(sum(w["totalStock"] for w in with_capacity) * 100 / capacity_sum, 1) if capacity_sum else None,
        "inboundToday": sum(w["inbound"] for w in result),
        "outboundToday": sum(w["outbound"] for w in result),
        "criticalAlerts": sum(w["criticalAlerts"] for w in result),
    }
    return {"summary": summary, "warehouses": result}


# --- inputs ----------------------------------------------------------------------------------


def _from_database(db: Session, ext: str, today: date) -> tuple[list[dict], list[dict], list[dict], dict[str, float]]:
    warehouses = [
        {"code": w.code, "name": w.name, "city": w.city, "capacity": w.capacity}
        for w in db.query(Warehouse).filter(Warehouse.external_system == ext, Warehouse.active_flag == True)  # noqa: E712
    ]
    stock = [
        {"warehouse_code": s.warehouse_code, "item_group": s.item_group, "in_stock": s.in_stock, "committed": s.committed, "ordered": s.ordered, "min_stock": s.min_stock}
        for s in db.query(StockLevel).filter(StockLevel.external_system == ext)
    ]
    window = (today - timedelta(days=30)).isoformat()
    movements = [
        {"warehouse_code": m.warehouse_code, "direction": m.direction, "doc_date": m.doc_date, "doc_entry": m.doc_entry, "quantity": m.quantity, "counterparty": m.counterparty}
        for m in db.query(StockMovement).filter(StockMovement.external_system == ext, StockMovement.doc_date >= window)
    ]
    overrides: dict[str, float] = {}
    for row in db.query(Configuration).filter(Configuration.key.like("warehouse_capacity:%")):
        try:
            overrides[row.key.split(":", 1)[1]] = float(row.value)
        except ValueError:
            continue
    return warehouses, stock, movements, overrides


def _from_mock_dataset(today: date, capacity_field: str) -> tuple[list[dict], list[dict], list[dict], dict[str, float]]:
    from app.integrations import sap_mock

    data = sap_mock.build_dataset(42, today)
    groups = {str(g["Number"]): g["GroupName"] for g in data["ItemGroups"]}
    warehouses = [
        {"code": w["WarehouseCode"], "name": w["WarehouseName"], "city": w["City"], "capacity": w.get(capacity_field)}
        for w in data["Warehouses"]
    ]
    stock = [
        {
            "warehouse_code": info["WarehouseCode"],
            "item_group": groups.get(str(item["ItemsGroupCode"]), ""),
            "in_stock": info["InStock"],
            "committed": info["Committed"],
            "ordered": info["Ordered"],
            "min_stock": info["MinimalStock"],
        }
        for item in data["Items"]
        for info in item["ItemWarehouseInfoCollection"]
    ]
    movements = [
        {"warehouse_code": line["WarehouseCode"], "direction": direction, "doc_date": doc["DocDate"], "doc_entry": doc["DocEntry"], "quantity": line["Quantity"], "counterparty": doc["CardName"]}
        for key, direction in (("DeliveryNotes", "out"), ("PurchaseDeliveryNotes", "in"))
        for doc in data[key]
        for line in doc["DocumentLines"]
    ]
    return warehouses, stock, movements, {}


def build_network(db: Session, *, today: date | None = None) -> dict:
    settings = get_settings()
    today = today or date.today()
    mode = settings.sap_mode_normalized

    if mode == "off":
        warehouses, stock, movements, overrides = _from_mock_dataset(today, settings.sap_warehouse_capacity_field)
        source = {"mode": "sample", "last_synced_at": None}
    else:
        ext = settings.sap_external_system
        warehouses, stock, movements, overrides = _from_database(db, ext, today)
        last_ok = (
            db.query(SapSyncRun)
            .filter(SapSyncRun.external_system == ext, SapSyncRun.status.in_(("success", "partial")))
            .order_by(SapSyncRun.ended_at.desc())
            .first()
        )
        source = {"mode": "live" if mode == "live" else "mock", "last_synced_at": last_ok.ended_at if last_ok else None}

    network = compute_network(warehouses, stock, movements, today=today, capacity_overrides=overrides)
    return {"source": source, **network}

