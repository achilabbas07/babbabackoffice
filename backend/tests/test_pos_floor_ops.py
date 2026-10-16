# Regression tests: F&B POS - roles, ojol pricing, payments/stock, open bills, split/merge/move/void, layout, fixtures, admin CRUD
# Uses only TEST_ data (TEST_AREA tables, TEST_ products/inventory/customers/users) and cleans up at the end.
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
CREATED_TRX = []


def login(pin):
    r = requests.post(f"{API}/auth/login", json={"pin": pin})
    assert r.status_code == 200, r.text
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    s.user = r.json()["user"]
    return s


@pytest.fixture(scope="module")
def admin():
    return login("1234")


@pytest.fixture(scope="module")
def kasir():
    return login("2222")


@pytest.fixture(scope="module")
def waiter():
    return login("3333")


@pytest.fixture(scope="module")
def data(admin):
    d = {"tables": [], "products": [], "inventory": [], "customers": [], "users": [], "expenses": []}
    inv = admin.post(f"{API}/inventory", json={"name": "TEST_Bahan", "type": "bahan", "stock": 1000, "unit": "pcs", "cost_per_unit": 1000}).json()
    d["inventory"].append(inv["id"])
    inv2 = admin.post(f"{API}/inventory", json={"name": "TEST_Langka", "type": "bahan", "stock": 1, "unit": "pcs", "cost_per_unit": 500}).json()
    d["inventory"].append(inv2["id"])
    p1 = admin.post(f"{API}/products", json={"name": "TEST_Kopi", "category": "TEST", "price": 20000, "price_ojol": 25000}).json()
    p2 = admin.post(f"{API}/products", json={"name": "TEST_Teh", "category": "TEST", "price": 10000, "price_ojol": 0}).json()
    p3 = admin.post(f"{API}/products", json={"name": "TEST_Langka", "category": "TEST", "price": 5000}).json()
    for p in (p1, p2, p3):
        d["products"].append(p["id"])
    r = admin.put(f"{API}/products/{p1['id']}/recipes", json=[{"inventoryId": inv["id"], "qty_needed": 2}])
    assert r.status_code == 200 and r.json()["product"]["hpp"] == 2000
    admin.put(f"{API}/products/{p2['id']}/recipes", json=[{"inventoryId": inv["id"], "qty_needed": 1}])
    admin.put(f"{API}/products/{p3['id']}/recipes", json=[{"inventoryId": inv2["id"], "qty_needed": 1}])
    for i in range(5):
        t = admin.post(f"{API}/tables", json={"name": f"TEST_T{i+1}", "area": "TEST_AREA"}).json()
        d["tables"].append(t["id"])
    fx = admin.post(f"{API}/tables", json={"name": "TEST_KASIR", "area": "TEST_AREA", "kind": "fixture"}).json()
    assert fx["kind"] == "fixture"
    d["fixture"] = fx["id"]
    d["tables_all"] = d["tables"] + [fx["id"]]
    c = admin.post(f"{API}/customers", json={"name": "TEST_Cust", "wa": "0800"}).json()
    d["customers"].append(c["id"])
    d.update(p1=p1["id"], p2=p2["id"], p3=p3["id"], inv=inv["id"], inv2=inv2["id"], cust=c["id"])
    yield d
    # cleanup
    for b in admin.get(f"{API}/open-bills").json():
        if b.get("tableId") in d["tables_all"] or any(i["productId"] in d["products"] for i in b["items_json"]):
            admin.post(f"{API}/open-bills/{b['id']}/void", json={"reason": "TEST cleanup"})
    for tid in d["tables_all"]:
        admin.delete(f"{API}/tables/{tid}")
    for pid in d["products"]:
        admin.delete(f"{API}/products/{pid}")
    for iid in d["inventory"]:
        admin.delete(f"{API}/inventory/{iid}")
    for cid in d["customers"]:
        admin.delete(f"{API}/customers/{cid}")
    for uid in d["users"]:
        admin.delete(f"{API}/users/{uid}")
    for eid in d["expenses"]:
        admin.delete(f"{API}/expenses/{eid}")
    print("CREATED_TRX:", CREATED_TRX)


def table(s, tid):
    return next(t for t in s.get(f"{API}/tables").json() if t["id"] == tid)


def pay(s, **kw):
    body = {"type": "Takeaway", "method": "QRIS", **kw}
    r = s.post(f"{API}/transactions", json=body)
    if r.status_code == 200:
        CREATED_TRX.append(r.json()["id"])
    return r


# --- Auth & roles
class TestRoles:
    @pytest.mark.parametrize("pin,role", [("1234", "admin"), ("2222", "kasir"), ("3333", "waiter")])
    def test_login(self, pin, role):
        r = requests.post(f"{API}/auth/login", json={"pin": pin})
        assert r.status_code == 200 and r.json()["user"]["role"] == role and "pin" not in r.json()["user"]

    def test_wrong_pin(self, admin):
        assert requests.post(f"{API}/auth/login", json={"pin": "9898"}).status_code == 401
        login("1234")  # reset attempts

    def test_forbidden(self, kasir, waiter, data):
        assert waiter.post(f"{API}/transactions", json={"type": "Takeaway", "method": "QRIS", "items": [{"productId": data["p2"], "qty": 1}]}).status_code == 403
        for ep in ("/inventory", "/reports/summary?start=2026-01-01&end=2026-01-02", "/users"):
            assert kasir.get(f"{API}{ep}").status_code == 403, ep

    def test_waiters_list(self, waiter):
        r = waiter.get(f"{API}/users/waiters")
        assert r.status_code == 200
        ids = [w["id"] for w in r.json()]
        assert "USR-WAITER" in ids and "USR-ADMIN" not in ids


# --- Ojol pricing / direct pay
class TestOjol:
    @pytest.mark.parametrize("typ", ["Walk In", "Ojek Online"])
    def test_open_bill_rejected(self, kasir, data, typ):
        assert kasir.post(f"{API}/open-bills", json={"type": typ, "items": [{"productId": data["p2"], "qty": 1}]}).status_code == 400

    def test_ojol_price_and_fallback(self, kasir, data):
        r = pay(kasir, type="Ojek Online", items=[{"productId": data["p1"], "qty": 1}, {"productId": data["p2"], "qty": 1}])
        assert r.status_code == 200, r.text
        assert r.json()["total"] == 35000
        assert r.json()["tableId"] is None

    def test_walk_in_normal_price_cash(self, kasir, data):
        items = [{"productId": data["p1"], "qty": 1}]
        assert pay(kasir, type="Walk In", method="Cash", cashGiven=10000, items=items).status_code == 400
        r = pay(kasir, type="Walk In", method="Cash", cashGiven=50000, items=items)
        assert r.status_code == 200 and r.json()["total"] == 20000 and r.json()["change"] == 30000


# --- Stock & customers
class TestStockCustomer:
    def test_recipe_stock_decrement(self, admin, kasir, data):
        before = {i["id"]: i["stock"] for i in admin.get(f"{API}/inventory").json()}
        r = pay(kasir, items=[{"productId": data["p1"], "qty": 3}], customerId=data["cust"])
        assert r.status_code == 200
        after = {i["id"]: i["stock"] for i in admin.get(f"{API}/inventory").json()}
        assert before[data["inv"]] - after[data["inv"]] == 6
        c = next(c for c in kasir.get(f"{API}/customers").json() if c["id"] == data["cust"])
        assert c["points"] == 6 and c["visits"] == 1 and c["total_spent"] == 60000

    def test_prd001_recipe(self, admin, kasir):
        rec = {r["inventoryId"]: r["qty_needed"] for r in admin.get(f"{API}/products/PRD-001/recipes").json()}
        before = {i["id"]: i["stock"] for i in admin.get(f"{API}/inventory").json()}
        r = pay(kasir, items=[{"productId": "PRD-001", "qty": 1}])
        assert r.status_code == 200, r.text
        after = {i["id"]: i["stock"] for i in admin.get(f"{API}/inventory").json()}
        for k, q in rec.items():
            assert abs(before[k] - after[k] - q) < 1e-6, k
        print("PRD-001 recipe", rec)

    def test_insufficient_stock(self, kasir, data):
        r = pay(kasir, items=[{"productId": data["p3"], "qty": 5}])
        assert r.status_code == 400 and "tidak cukup" in r.json()["detail"]


# --- Open bills / tables floor ops
class TestFloorOps:
    def bill(self, s, data, idx, items):
        r = s.post(f"{API}/open-bills", json={"type": "Dine In", "tableId": data["tables"][idx], "waiterName": "Waiter Demo", "items": items})
        assert r.status_code == 200, r.text
        return r.json()

    def test_fixture_not_orderable(self, kasir, data):
        r = kasir.post(f"{API}/open-bills", json={"type": "Dine In", "tableId": data["fixture"], "items": [{"productId": data["p2"], "qty": 1}]})
        assert r.status_code == 400

    def test_open_bill_full_pay_paid_clear(self, waiter, kasir, data):
        b = self.bill(waiter, data, 0, [{"productId": data["p2"], "qty": 2}])
        t = table(kasir, data["tables"][0])
        assert t["status"] == "occupied" and t["orderData"]["openBillId"] == b["id"]
        # occupied twice -> 409
        assert kasir.post(f"{API}/open-bills", json={"type": "Dine In", "tableId": data["tables"][0], "items": [{"productId": data["p2"], "qty": 1}]}).status_code == 409
        # update bill
        r = kasir.put(f"{API}/open-bills/{b['id']}", json={"type": "Dine In", "tableId": data["tables"][0], "items": [{"productId": data["p2"], "qty": 3}]})
        assert r.status_code == 200 and r.json()["total"] == 30000
        r = pay(kasir, type="Dine In", openBillId=b["id"], tableId=data["tables"][0], items=[{"productId": data["p2"], "qty": 3}])
        assert r.status_code == 200
        assert kasir.get(f"{API}/open-bills/{b['id']}").status_code == 404
        t = table(kasir, data["tables"][0])
        assert t["status"] == "paid"
        r = kasir.put(f"{API}/tables/{data['tables'][0]}/status", json={"status": "available"})
        assert r.status_code == 200 and r.json()["status"] == "available"

    def test_split_bill(self, kasir, data):
        b = self.bill(kasir, data, 1, [{"productId": data["p1"], "qty": 2}, {"productId": data["p2"], "qty": 2}])
        # exceed qty
        r = pay(kasir, type="Dine In", openBillId=b["id"], partial=True, items=[{"productId": data["p1"], "qty": 3}])
        assert r.status_code == 400
        r = pay(kasir, type="Dine In", openBillId=b["id"], partial=True, items=[{"productId": data["p1"], "qty": 1}])
        assert r.status_code == 200 and r.json()["total"] == 20000
        rem = kasir.get(f"{API}/open-bills/{b['id']}").json()
        assert rem["total"] == 40000
        assert table(kasir, data["tables"][1])["status"] == "occupied"
        assert table(kasir, data["tables"][1])["orderData"]["total"] == 40000
        r = pay(kasir, type="Dine In", openBillId=b["id"], partial=True, items=[{"productId": data["p1"], "qty": 1}, {"productId": data["p2"], "qty": 2}])
        assert r.status_code == 200
        assert kasir.get(f"{API}/open-bills/{b['id']}").status_code == 404
        assert table(kasir, data["tables"][1])["status"] == "paid"
        kasir.put(f"{API}/tables/{data['tables'][1]}/status", json={"status": "available"})

    def test_merge_and_move(self, kasir, data):
        a = self.bill(kasir, data, 2, [{"productId": data["p2"], "qty": 1}])
        s = self.bill(kasir, data, 3, [{"productId": data["p2"], "qty": 2}, {"productId": data["p1"], "qty": 1}])
        assert kasir.post(f"{API}/open-bills/{a['id']}/merge", json={"sourceBillId": a["id"]}).status_code == 400
        r = kasir.post(f"{API}/open-bills/{a['id']}/merge", json={"sourceBillId": s["id"]})
        assert r.status_code == 200 and r.json()["total"] == 50000
        assert kasir.get(f"{API}/open-bills/{s['id']}").status_code == 404
        assert table(kasir, data["tables"][3])["status"] == "available"
        assert table(kasir, data["tables"][2])["orderData"]["total"] == 50000
        # move to fixture rejected, to new table ok
        assert kasir.post(f"{API}/open-bills/{a['id']}/move", json={"tableId": data["fixture"]}).status_code == 400
        r = kasir.post(f"{API}/open-bills/{a['id']}/move", json={"tableId": data["tables"][4]})
        assert r.status_code == 200
        assert table(kasir, data["tables"][2])["status"] == "available"
        t = table(kasir, data["tables"][4])
        assert t["status"] == "occupied" and t["orderData"]["openBillId"] == a["id"]
        data["moved_bill"] = a["id"]

    def test_move_to_occupied_409(self, kasir, data):
        b = self.bill(kasir, data, 0, [{"productId": data["p2"], "qty": 1}])
        r = kasir.post(f"{API}/open-bills/{b['id']}/move", json={"tableId": data["tables"][4]})
        assert r.status_code == 409
        data["bill_t0"] = b["id"]

    def test_void(self, admin, kasir, data):
        bid = data["moved_bill"]
        assert kasir.delete(f"{API}/open-bills/{bid}").status_code in (404, 405)
        assert kasir.post(f"{API}/open-bills/{bid}/void", json={"reason": "x"}).status_code == 403
        assert kasir.post(f"{API}/open-bills/{bid}/void", json={"reason": "x", "adminPin": "9797"}).status_code == 401
        before = admin.get(f"{API}/schema").json()["counts"]["void_logs"]
        r = kasir.post(f"{API}/open-bills/{bid}/void", json={"reason": "TEST void", "adminPin": "1234"})
        assert r.status_code == 200 and r.json()["authorizedBy"] == "Admin"
        assert kasir.get(f"{API}/open-bills/{bid}").status_code == 404
        assert table(kasir, data["tables"][4])["status"] == "available"
        assert admin.get(f"{API}/schema").json()["counts"]["void_logs"] == before + 1
        # admin void without pin
        r = admin.post(f"{API}/open-bills/{data['bill_t0']}/void", json={"reason": "TEST"})
        assert r.status_code == 200

    def test_verify_admin(self, waiter):
        r = waiter.post(f"{API}/auth/verify-admin", json={"pin": "1234"})
        assert r.status_code == 200 and r.json()["ok"]

    def test_layout_persist(self, admin, kasir, data):
        r = admin.put(f"{API}/tables/layout", json=[{"id": data["tables"][0], "x": 7, "y": 3}, {"id": data["fixture"], "x": 0, "y": 0}])
        assert r.status_code == 200
        t = table(admin, data["tables"][0])
        assert t["x"] == 7 and t["y"] == 3
        assert kasir.put(f"{API}/tables/layout", json=[]).status_code == 403
        r = admin.put(f"{API}/tables/{data['tables'][0]}", json={"name": "TEST_T1b", "area": "TEST_AREA", "kind": "table"})
        assert r.status_code == 200 and r.json()["name"] == "TEST_T1b"


# --- Admin CRUD: inventory, purchases, expenses, reports, users
class TestAdminCrud:
    def test_inventory_409_and_purchase(self, admin, data):
        assert admin.delete(f"{API}/inventory/{data['inv']}").status_code == 409
        r = admin.post(f"{API}/purchases", json={"supplier": "TEST_Sup", "items": [{"inventoryId": data["inv"], "qty": 10, "cost_per_unit": 1500}]})
        assert r.status_code == 200 and r.json()["total_cost"] == 15000
        inv = next(i for i in admin.get(f"{API}/inventory").json() if i["id"] == data["inv"])
        assert inv["cost_per_unit"] == 1500
        p = next(p for p in admin.get(f"{API}/products").json() if p["id"] == data["p1"])
        assert p["hpp"] == 3000

    def test_expense_report(self, admin, data):
        r = admin.post(f"{API}/expenses", json={"category": "TEST", "description": "TEST_exp", "amount": 1234})
        assert r.status_code == 200
        data["expenses"].append(r.json()["id"])
        rep = admin.get(f"{API}/reports/summary", params={"start": "2020-01-01T00:00:00Z", "end": "2030-01-01T00:00:00Z"}).json()
        assert abs(rep["net_profit"] - (rep["revenue"] - rep["cogs"] - rep["expenses"])) < 1e-6
        assert rep["expenses"] >= 1234
        assert admin.delete(f"{API}/expenses/{data['expenses'][0]}").status_code == 200
        data["expenses"].clear()

    def test_users_unique_pin(self, admin, data):
        assert admin.post(f"{API}/users", json={"name": "TEST_dup", "role": "kasir", "pin": "2222"}).status_code == 409
        r = admin.post(f"{API}/users", json={"name": "TEST_W", "role": "waiter", "pin": "818283"})
        assert r.status_code == 200
        data["users"].append(r.json()["id"])
        r = admin.put(f"{API}/users/{r.json()['id']}", json={"name": "TEST_W2", "role": "waiter"})
        assert r.status_code == 200 and r.json()["name"] == "TEST_W2"
