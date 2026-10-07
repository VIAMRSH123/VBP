"""In-process fake SAP Business One Service Layer.

Serves a deterministic, Service-Layer-shaped dataset for a Telangana food business through an
`httpx.MockTransport`, so the real client code path (login, session expiry, paging, filters) runs
unchanged in mock mode and in tests. Field names follow the public Service Layer documentation and
may need adjusting against a real server's `$metadata` (see integrations/sap_entities.py).
"""
import json
import random
import re
from datetime import date, timedelta

import httpx

MOCK_BASE_URL = "http://sap-mock.local"
DEFAULT_PAGE_SIZE = 20
STAGES = {1: ("Lead", 10), 2: ("Qualification", 25), 3: ("Proposal", 50), 4: ("Negotiation", 75), 5: ("Closing", 100)}

WAREHOUSES = [  # (code, name, city, capacity in units) — sized against the generated stock for ~50-90% utilization
    ("WH01", "Hyderabad Hub", "Hyderabad", 71000),
    ("WH02", "Warangal Depot", "Warangal", 72500),
    ("WH03", "Karimnagar Store", "Karimnagar", 76500),
    ("WH04", "Nizamabad Depot", "Nizamabad", 158000),
    ("WH05", "Khammam Store", "Khammam", None),  # no capacity field on purpose -> UI shows "n/a"
    ("WH06", "Secunderabad Cold Store", "Secunderabad", 56000),
]
ITEM_GROUPS = [
    (101, "Rice & Grains", "RICE", ["Sona Masoori Rice 25kg", "Basmati Rice 1kg", "Brown Rice 5kg", "Poha 500g", "Ragi Flour 1kg", "Jowar 1kg"]),
    (102, "Edible Oils", "OIL", ["Groundnut Oil 1L", "Sunflower Oil 1L", "Palm Oil 15L Tin", "Sesame Oil 500ml", "Coconut Oil 1L", "Rice Bran Oil 1L"]),
    (103, "Pulses", "DAL", ["Toor Dal 1kg", "Moong Dal 1kg", "Chana Dal 1kg", "Urad Dal 1kg", "Masoor Dal 1kg", "Rajma 1kg"]),
    (104, "Spices", "SPC", ["Red Chilli Powder 500g", "Turmeric Powder 500g", "Coriander Powder 500g", "Garam Masala 200g", "Cumin Seeds 500g", "Mustard Seeds 500g"]),
    (105, "Flour & Atta", "FLR", ["Wheat Atta 10kg", "Maida 1kg", "Rava 1kg", "Besan 1kg", "Rice Flour 1kg", "Multigrain Atta 5kg"]),
    (106, "Beverages", "BEV", ["Tea Powder 1kg", "Instant Coffee 200g", "Packaged Water 1L Case", "Buttermilk 200ml Case", "Fruit Juice 1L", "Energy Drink 250ml"]),
    (107, "Packaging", "PKG", ["Carry Bags Bundle", "Corrugated Boxes", "Stretch Film Roll", "Pouch Rolls", "Labels Roll", "Pallet Wrap"]),
    (108, "Snacks", "SNK", ["Murukku 200g", "Banana Chips 200g", "Mixture 400g", "Peanut Chikki 100g", "Namkeen Pack", "Biscuit Case"]),
]
TERRITORIES = ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Nalgonda"]
INDUSTRIES = ["Retail", "Hotels & Restaurants", "Supermarkets", "Wholesale Distribution", "Institutional Catering", "Food Processing"]
SALES_PEOPLE = [
    (1, "Ravi Kumar", "9848011101"),
    (2, "Anitha Reddy", "9848011102"),
    (3, "Srinivas Rao", "9848011103"),
    (4, "Lakshmi Devi", "9848011104"),
    (5, "Mohammed Imran", "9848011105"),
    (6, "Kavitha Naidu", "9848011106"),
]
CUSTOMERS = [
    "Hotel Minerva Grand", "Paradise Biryani Chain", "Deccan Catering Services", "Ohri's Restaurants", "Sri Annapurna Mess",
    "Ratnadeep Supermarket", "Heritage Fresh Retail", "Spencer's Warangal", "Vijetha Supermarkets", "More Retail Karimnagar",
    "Sri Venkateswara Traders", "Lakshmi Narasimha Wholesale", "Bharat Kirana Distributors", "Krishna Grain Merchants",
    "Osmania Hostels Mess", "Nizam Institute Canteen", "KIMS Hospital Catering", "NIT Warangal Mess",
    "Deccan Foods Pvt Ltd", "Golconda Snacks Industries", "Charminar Hospitality", "Kakatiya Hotels",
    "Godavari Fresh Mart", "Nalgonda Agro Traders",
]
LEADS = [
    "Charminar Sweets", "Kakatiya Restaurants", "Bhagyanagar Bakers", "Sri Sai Mess Nizamabad", "Godavari Foods Khammam",
    "Pochampally Hospitality", "Telangana Tiffins", "Hitech Canteen Services", "Medchal Mart", "Banjara Bistro",
]
SUPPLIERS = ["Telangana Rice Mills", "Nalgonda Oil Industries", "Guntur Spice Traders", "Andhra Packaging Co"]
CONTACTS = ["Venkat Reddy", "Suresh Babu", "Padma Latha", "Ramesh Goud", "Sunitha Rao", "Prakash Yadav", "Swathi Chowdary", "Naresh Kumar"]
DEAL_VALUES = [45_000, 120_000, 250_000, 480_000, 900_000, 1_800_000]


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def _clock(rng: random.Random) -> str:
    return f"{rng.randint(8, 18):02d}:{rng.randint(0, 59):02d}:00"


def _doc_lines(rng: random.Random, items: list[dict], target_net: float, warehouse_codes: list[str]) -> list[dict]:
    count = rng.randint(1, 3)
    chosen = rng.sample(items, count)
    lines = []
    for number, item in enumerate(chosen):
        qty = rng.choice([50, 100, 200, 400, 800])
        price = round((target_net / count) / qty, 2)
        lines.append(
            {
                "LineNum": number,
                "ItemCode": item["ItemCode"],
                "ItemDescription": item["ItemName"],
                "Quantity": float(qty),
                "Price": price,
                "WarehouseCode": rng.choice(warehouse_codes),
            }
        )
    return lines


def build_dataset(seed: int = 42, as_of: date | None = None) -> dict[str, list[dict]]:
    rng = random.Random(seed)
    today = as_of or date.today()
    iso = lambda d: d.isoformat()  # noqa: E731
    wh_codes = [w[0] for w in WAREHOUSES]

    warehouses = []
    for code, name, city, capacity in WAREHOUSES:
        row = {"WarehouseCode": code, "WarehouseName": name, "City": city, "Inactive": "tNO"}
        if capacity is not None:
            row["U_Capacity"] = float(capacity)
        warehouses.append(row)

    item_groups = [{"Number": number, "GroupName": group} for number, group, _, _ in ITEM_GROUPS]

    items: list[dict] = []
    for number, group, prefix, names in ITEM_GROUPS:
        for index, item_name in enumerate(names, start=1):
            info = []
            for code in rng.sample(wh_codes, rng.randint(3, 5)):
                base = rng.choice([200, 500, 1200, 2500])
                minimum = int(base * 0.5)
                roll = rng.random()
                critical_bias = 0.35 if code == "WH05" else 0.05  # Khammam runs short on purpose
                if roll < critical_bias:
                    in_stock = rng.choice([0, int(minimum * 0.3)])
                elif roll < critical_bias + 0.12:
                    in_stock = int(minimum * rng.uniform(0.55, 0.95))
                else:
                    in_stock = int(base * rng.uniform(0.8, 3.0))
                info.append(
                    {
                        "WarehouseCode": code,
                        "InStock": float(in_stock),
                        "Committed": float(int(in_stock * rng.uniform(0, 0.3))),
                        "Ordered": float(rng.choice([0, 0, 100, 300, 600])),
                        "MinimalStock": float(minimum),
                    }
                )
            items.append(
                {
                    "ItemCode": f"{prefix}{index:03d}",
                    "ItemName": item_name,
                    "ItemsGroupCode": number,
                    "ItemWarehouseInfoCollection": info,
                    "UpdateDate": iso(today - timedelta(days=rng.randint(0, 20))),
                }
            )

    sales_persons = [{"SalesEmployeeCode": -1, "SalesEmployeeName": "-No Sales Employee-", "Active": "tYES"}]
    for code, name, mobile in SALES_PEOPLE:
        sales_persons.append(
            {
                "SalesEmployeeCode": code,
                "SalesEmployeeName": name,
                "Mobile": mobile,
                "Email": f"{_slug(name)}@tfs.example",
                "Active": "tYES",
            }
        )

    territories = [{"TerritoryID": i, "Description": name} for i, name in enumerate(TERRITORIES, start=1)]
    industries = [{"IndustryCode": i, "IndustryName": name, "IndustryDescription": name} for i, name in enumerate(INDUSTRIES, start=1)]
    stages = [{"SequenceNo": number, "Name": name, "ClosingPercentage": pct} for number, (name, pct) in STAGES.items()]

    partners: list[dict] = []

    def add_partner(prefix: str, number: int, name: str, card_type: str, with_mobile: bool = True) -> None:
        territory = rng.randint(1, len(TERRITORIES))
        partners.append(
            {
                "CardCode": f"{prefix}{number}",
                "CardName": name,
                "CardType": card_type,
                "Phone1": f"040-2355{rng.randint(1000, 9999)}",
                "Cellular": f"9{rng.randint(100000000, 999999999)}" if with_mobile else "",
                "EmailAddress": f"purchase@{_slug(name)}.example",
                "ContactPerson": rng.choice(CONTACTS),
                "City": TERRITORIES[territory - 1],
                "Territory": territory,
                "Industry": rng.randint(1, len(INDUSTRIES)),
                "SalesPersonCode": rng.choice([c for c, _, _ in SALES_PEOPLE]),
                "Currency": "INR",
                "UpdateDate": iso(today - timedelta(days=rng.randint(0, 60))),
            }
        )

    for index, name in enumerate(CUSTOMERS, start=1):
        add_partner("C", 1000 + index, name, "cCustomer")
    for index, name in enumerate(LEADS, start=1):
        add_partner("L", 2000 + index, name, "cLid", with_mobile=index % 4 != 0)
    for index, name in enumerate(SUPPLIERS, start=1):
        add_partner("S", 3000 + index, name, "cSupplier")

    customers_and_leads = [p for p in partners if p["CardType"] in ("cCustomer", "cLid")]
    opportunities: list[dict] = []
    quotations: list[dict] = []
    orders: list[dict] = []
    quote_entry, order_entry = 1000, 5000

    for sequence in range(1, 46):
        partner = rng.choice(customers_and_leads)
        roll = rng.random()
        status = "sos_Open" if roll < 0.58 else "sos_Sold" if roll < 0.83 else "sos_Missed"
        stage = rng.randint(1, 4) if status != "sos_Sold" else 5
        pct = STAGES[stage][1] if status != "sos_Missed" else 0
        amount = rng.choice(DEAL_VALUES)
        start = today - timedelta(days=rng.randint(5, 120))
        closing = start + timedelta(days=rng.randint(15, 80))
        updated = today if sequence % 9 == 0 else today - timedelta(days=rng.randint(0, 30))
        if status != "sos_Open":
            updated = min(closing, today)
        lines = []
        for step in range(1, stage + 1):
            lines.append(
                {
                    "SequenceNo": step - 1,
                    "StartDate": iso(start + timedelta(days=step * 3)),
                    "ClosingDate": iso(start + timedelta(days=step * 6)),
                    "StageKey": step,
                    "PercentageRate": float(STAGES[step][1]),
                    "MaxLocalTotal": float(amount),
                    "DocumentType": None,
                    "DocumentNumber": None,
                }
            )

        needs_quote = (status == "sos_Open" and stage >= 3) or status == "sos_Sold"
        if needs_quote:
            quote_entry += 1
            net = amount / 1.05
            quote_date = start + timedelta(days=12)
            quotations.append(
                {
                    "DocEntry": quote_entry,
                    "DocNum": quote_entry + 1000,
                    "CardCode": partner["CardCode"],
                    "DocDate": iso(quote_date),
                    "DocDueDate": iso(quote_date + timedelta(days=rng.choice([10, 20, 30]))),
                    "DocTotal": round(amount, 2),
                    "VatSum": round(amount - net, 2),
                    "DocCurrency": "INR",
                    "DocumentStatus": "bost_Open" if status == "sos_Open" else "bost_Close",
                    "Cancelled": "tNO",
                    "SalesPersonCode": rng.choice([c for c, _, _ in SALES_PEOPLE]),
                    "DocumentLines": _doc_lines(rng, items, net, wh_codes),
                    "UpdateDate": iso(updated),
                    "UpdateTime": _clock(rng),
                }
            )
            link = lines[min(2, len(lines) - 1)]
            link["DocumentType"] = "sodt_Quotation"
            link["DocumentNumber"] = quote_entry

        if status == "sos_Sold":
            order_entry += 1
            net = amount / 1.05
            order_date = min(closing, today)
            cancelled = sequence % 11 == 0
            orders.append(
                {
                    "DocEntry": order_entry,
                    "DocNum": order_entry + 1000,
                    "CardCode": partner["CardCode"],
                    "DocDate": iso(order_date),
                    "DocDueDate": iso(order_date + timedelta(days=10)),
                    "DocTotal": round(amount, 2),
                    "VatSum": round(amount - net, 2),
                    "DocCurrency": "INR",
                    "DocumentStatus": "bost_Open",
                    "Cancelled": "tYES" if cancelled else "tNO",
                    "SalesPersonCode": rng.choice([c for c, _, _ in SALES_PEOPLE]),
                    "DocumentLines": _doc_lines(rng, items, net, wh_codes),
                    "UpdateDate": iso(updated),
                    "UpdateTime": _clock(rng),
                }
            )
            lines[-1]["DocumentType"] = "sodt_Order"
            lines[-1]["DocumentNumber"] = order_entry

        stage_name = STAGES[stage][0]
        opportunities.append(
            {
                "SequentialNo": sequence,
                "OpportunityName": f"{rng.choice(['Annual', 'Quarterly', 'Monthly', 'Festival'])} supply - {partner['CardName']}",
                "CardCode": partner["CardCode"],
                "CustomerName": partner["CardName"],
                "SalesPerson": rng.choice([c for c, _, _ in SALES_PEOPLE]),
                "ContactPerson": partner["ContactPerson"],
                "StartDate": iso(start),
                "PredictedClosingDate": iso(closing),
                "ClosingDate": iso(closing) if status != "sos_Open" else None,
                "MaxLocalTotal": float(amount),
                "WeightedSumLC": round(amount * pct / 100, 2),
                "Status": status,
                "CurrentStageNo": stage,
                "CurrentStageName": stage_name,
                "ClosingPercentage": float(pct),
                "Territory": partner["Territory"],
                "Industry": partner["Industry"],
                "UpdateDate": iso(updated),
                "UpdateTime": _clock(rng),
                "SalesOpportunitiesLines": lines,
            }
        )

    # A few quotations deliberately cancelled or past due, to exercise status mapping.
    for index, quotation in enumerate(quotations):
        if index % 7 == 3 and quotation["DocumentStatus"] == "bost_Open":
            quotation["DocDueDate"] = iso(today - timedelta(days=5))

    def movements(cards: list[str], count: int, today_count: int, base_entry: int) -> list[dict]:
        rows = []
        for index in range(count):
            doc_date = today if index < today_count else today - timedelta(days=rng.randint(1, 30))
            chosen = rng.sample(items, rng.randint(1, 3))
            rows.append(
                {
                    "DocEntry": base_entry + index,
                    "DocNum": base_entry + index + 500,
                    "DocDate": iso(doc_date),
                    "CardName": rng.choice(cards),
                    "Cancelled": "tNO",
                    "UpdateDate": iso(doc_date),
                    "DocumentLines": [
                        {
                            "LineNum": n,
                            "ItemCode": it["ItemCode"],
                            "ItemDescription": it["ItemName"],
                            "Quantity": float(rng.choice([20, 50, 100, 200, 400])),
                            "WarehouseCode": rng.choice(wh_codes),
                        }
                        for n, it in enumerate(chosen)
                    ],
                }
            )
        return rows

    delivery_notes = movements(CUSTOMERS, 45, 6, 7000)
    purchase_delivery_notes = movements(SUPPLIERS, 32, 4, 9000)

    return {
        "Warehouses": warehouses,
        "ItemGroups": item_groups,
        "Items": items,
        "SalesPersons": sales_persons,
        "Territories": territories,
        "Industries": industries,
        "SalesStages": stages,
        "BusinessPartners": partners,
        "SalesOpportunities": opportunities,
        "Quotations": quotations,
        "Orders": orders,
        "DeliveryNotes": delivery_notes,
        "PurchaseDeliveryNotes": purchase_delivery_notes,
    }


# --- OData query evaluation ------------------------------------------------------------------

_CLAUSE = re.compile(r"^\s*(\w+)\s+(eq|ne|ge|gt|le|lt)\s+(.+?)\s*$", re.IGNORECASE)


def _literal(raw: str):
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] == "'":
        return raw[1:-1]
    return raw


def _compare(left, op: str, right) -> bool:
    if left is None:
        return False
    try:
        a, b = float(left), float(right)
    except (TypeError, ValueError):
        a, b = str(left), str(right)
    return {"eq": a == b, "ne": a != b, "ge": a >= b, "gt": a > b, "le": a <= b, "lt": a < b}[op]


def _apply_filter(rows: list[dict], expression: str | None) -> list[dict]:
    if not expression:
        return rows
    clauses = re.split(r"\s+and\s+", expression, flags=re.IGNORECASE)
    parsed = []
    for clause in clauses:
        match = _CLAUSE.match(clause)
        if not match:
            raise ValueError(f"Unsupported $filter clause: {clause!r}")
        parsed.append((match.group(1), match.group(2).lower(), _literal(match.group(3))))
    return [row for row in rows if all(_compare(row.get(field), op, value) for field, op, value in parsed)]


class MockSapServer:
    def __init__(self, seed: int = 42, as_of: date | None = None, version: str = "v1"):
        self.seed = seed
        self.as_of = as_of or date.today()
        self.version = version
        self.data = build_dataset(seed, self.as_of)
        self.sessions: set[str] = set()
        self.require_credentials: tuple[str, str, str] | None = None  # (CompanyDB, UserName, Password)
        self.expire_session_after: int | None = None  # kill the session once, after N authenticated reads
        self.fail_next: list[int] = []  # HTTP statuses to return (consumed one per read) to test retries
        self.max_page_size = 100
        self.requests: list[str] = []
        self._logins = 0
        self._reads = 0

    def transport(self) -> httpx.MockTransport:
        return httpx.MockTransport(self.handle)

    # -- responses ----------------------------------------------------------

    @staticmethod
    def _error(status: int, code: int, message: str) -> httpx.Response:
        return httpx.Response(status, json={"error": {"code": code, "message": {"lang": "en-us", "value": message}}})

    def _next_link_key(self) -> str:
        return "@odata.nextLink" if self.version == "v2" else "odata.nextLink"

    def _session_ok(self, request: httpx.Request) -> bool:
        cookie = request.headers.get("cookie", "")
        match = re.search(r"B1SESSION=([^;]+)", cookie)
        return bool(match and match.group(1) in self.sessions)

    def handle(self, request: httpx.Request) -> httpx.Response:
        prefix = f"/b1s/{self.version}/"
        path = request.url.path
        if not path.startswith(prefix):
            return self._error(404, -1, "Unknown service path")
        resource = path[len(prefix):].strip("/")
        self.requests.append(f"{request.method} {resource}")

        if resource == "Login" and request.method == "POST":
            return self._login(request)
        if resource == "Logout" and request.method == "POST":
            match = re.search(r"B1SESSION=([^;]+)", request.headers.get("cookie", ""))
            if match:
                self.sessions.discard(match.group(1))
            return httpx.Response(204)
        if request.method != "GET":
            return self._error(405, -1, "Mock SAP is read-only")

        if self.fail_next:
            status = self.fail_next.pop(0)
            return httpx.Response(status, text="upstream error")

        self._reads += 1
        if self.expire_session_after is not None and self._reads == self.expire_session_after:
            self.sessions.clear()
        if not self._session_ok(request):
            return self._error(401, -5002, "Invalid session or session already timeout.")
        return self._read(resource, request)

    def _login(self, request: httpx.Request) -> httpx.Response:
        try:
            body = json.loads(request.content or b"{}")
        except json.JSONDecodeError:
            return self._error(400, -1, "Invalid JSON")
        if self.require_credentials is not None:
            given = (body.get("CompanyDB"), body.get("UserName"), body.get("Password"))
            if given != self.require_credentials:
                return self._error(401, -304, "Fail to get DB Credentials from JWT")
        self._logins += 1
        token = f"mock-session-{self._logins}"
        self.sessions.add(token)
        return httpx.Response(
            200,
            json={"SessionId": token, "Version": "1000190", "SessionTimeout": 30},
            headers=[("set-cookie", f"B1SESSION={token}; path=/; HttpOnly"), ("set-cookie", "ROUTEID=.node1; path=/")],
        )

    def _read(self, entity: str, request: httpx.Request) -> httpx.Response:
        if entity not in self.data:
            return self._error(404, -2013, f"Entity '{entity}' is not available in the mock")
        params = request.url.params
        try:
            rows = _apply_filter(list(self.data[entity]), params.get("$filter"))
        except ValueError as exc:
            return self._error(400, -1, str(exc))

        orderby = params.get("$orderby")
        if orderby:
            field, _, direction = orderby.strip().partition(" ")
            rows.sort(key=lambda r: (r.get(field) is None, r.get(field)), reverse=direction.lower() == "desc")

        skip = int(params.get("$skip", 0))
        top = params.get("$top")
        prefer = re.search(r"odata\.maxpagesize=(\d+)", request.headers.get("prefer", ""))
        size = min(int(prefer.group(1)) if prefer else DEFAULT_PAGE_SIZE, self.max_page_size)

        next_link = None
        if top is not None:
            page = rows[skip : skip + int(top)]
        else:
            page = rows[skip : skip + size]
            if skip + size < len(rows):
                kept = [(k, v) for k, v in params.multi_items() if k != "$skip"]
                query = "&".join(f"{k}={v}" for k, v in kept + [("$skip", str(skip + size))])
                next_link = f"{entity}?{query}"

        select = params.get("$select")
        if select:
            wanted = {name.strip() for name in select.split(",")}
            page = [{k: v for k, v in row.items() if k in wanted} for row in page]

        context_key = "@odata.context" if self.version == "v2" else "odata.metadata"
        body: dict = {context_key: f"{MOCK_BASE_URL}/b1s/{self.version}/$metadata#{entity}", "value": page}
        if next_link:
            body[self._next_link_key()] = next_link
        return httpx.Response(200, json=body)

    # -- dev/test helpers ---------------------------------------------------

    def drift(self, rounds: int = 1) -> dict[str, int]:
        """Mutate the dataset like a working day would, so incremental sync has something to find."""
        rng = random.Random(self.seed + 1000 + self._logins)
        today = self.as_of.isoformat()
        changes = {"advanced": 0, "closed": 0, "new_opportunities": 0, "new_orders": 0, "movements": 0}
        opportunities = self.data["SalesOpportunities"]
        for _ in range(rounds):
            open_ones = [o for o in opportunities if o["Status"] == "sos_Open" and o["CurrentStageNo"] < 4]
            for opp in rng.sample(open_ones, min(3, len(open_ones))):
                opp["CurrentStageNo"] += 1
                name, pct = STAGES[opp["CurrentStageNo"]]
                opp["CurrentStageName"], opp["ClosingPercentage"] = name, float(pct)
                opp["WeightedSumLC"] = round(opp["MaxLocalTotal"] * pct / 100, 2)
                opp["UpdateDate"], opp["UpdateTime"] = today, _clock(rng)
                changes["advanced"] += 1

            candidates = [o for o in opportunities if o["Status"] == "sos_Open"]
            if candidates:
                winner = rng.choice(candidates)
                winner.update({"Status": "sos_Sold", "CurrentStageNo": 5, "ClosingPercentage": 100.0, "ClosingDate": today})
                winner["CurrentStageName"] = STAGES[5][0]
                winner["UpdateDate"], winner["UpdateTime"] = today, _clock(rng)
                entry = max(o["DocEntry"] for o in self.data["Orders"]) + 1
                net = winner["MaxLocalTotal"] / 1.05
                self.data["Orders"].append(
                    {
                        "DocEntry": entry,
                        "DocNum": entry + 1000,
                        "CardCode": winner["CardCode"],
                        "DocDate": today,
                        "DocDueDate": today,
                        "DocTotal": round(winner["MaxLocalTotal"], 2),
                        "VatSum": round(winner["MaxLocalTotal"] - net, 2),
                        "DocCurrency": "INR",
                        "DocumentStatus": "bost_Open",
                        "Cancelled": "tNO",
                        "SalesPersonCode": winner["SalesPerson"],
                        "DocumentLines": _doc_lines(rng, self.data["Items"], net, [w[0] for w in WAREHOUSES]),
                        "UpdateDate": today,
                        "UpdateTime": _clock(rng),
                    }
                )
                winner["SalesOpportunitiesLines"][-1]["DocumentType"] = "sodt_Order"
                winner["SalesOpportunitiesLines"][-1]["DocumentNumber"] = entry
                changes["closed"] += 1
                changes["new_orders"] += 1

            leads = [p for p in self.data["BusinessPartners"] if p["CardType"] == "cLid"]
            partner = rng.choice(leads)
            sequence = max(o["SequentialNo"] for o in opportunities) + 1
            opportunities.append(
                {
                    "SequentialNo": sequence,
                    "OpportunityName": f"New enquiry - {partner['CardName']}",
                    "CardCode": partner["CardCode"],
                    "CustomerName": partner["CardName"],
                    "SalesPerson": partner["SalesPersonCode"],
                    "ContactPerson": partner["ContactPerson"],
                    "StartDate": today,
                    "PredictedClosingDate": today,
                    "ClosingDate": None,
                    "MaxLocalTotal": float(rng.choice(DEAL_VALUES)),
                    "WeightedSumLC": 0.0,
                    "Status": "sos_Open",
                    "CurrentStageNo": 1,
                    "CurrentStageName": STAGES[1][0],
                    "ClosingPercentage": 10.0,
                    "Territory": partner["Territory"],
                    "Industry": partner["Industry"],
                    "UpdateDate": today,
                    "UpdateTime": _clock(rng),
                    "SalesOpportunitiesLines": [],
                }
            )
            changes["new_opportunities"] += 1

            for key, base in (("DeliveryNotes", 7000), ("PurchaseDeliveryNotes", 9000)):
                rows = self.data[key]
                entry = max(r["DocEntry"] for r in rows) + 1
                item = rng.choice(self.data["Items"])
                rows.append(
                    {
                        "DocEntry": entry,
                        "DocNum": entry + 500,
                        "DocDate": today,
                        "CardName": "Drift Test Customer",
                        "Cancelled": "tNO",
                        "UpdateDate": today,
                        "DocumentLines": [
                            {
                                "LineNum": 0,
                                "ItemCode": item["ItemCode"],
                                "ItemDescription": item["ItemName"],
                                "Quantity": 75.0,
                                "WarehouseCode": "WH01",
                            }
                        ],
                    }
                )
                changes["movements"] += 1
        return changes


_server: MockSapServer | None = None


def get_mock_server() -> MockSapServer:
    global _server
    if _server is None:
        _server = MockSapServer()
    return _server


def reset_mock_server(seed: int = 42, as_of: date | None = None, version: str = "v1") -> MockSapServer:
    global _server
    _server = MockSapServer(seed=seed, as_of=as_of, version=version)
    return _server
