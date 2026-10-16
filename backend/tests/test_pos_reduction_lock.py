# Regression: reduction lock on saved open bills (kasir/waiter need admin PIN to reduce/remove), void PIN, verify-admin.
# Only touches TEST_ data; cleans up at end.
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
    d = {}
    p1 = admin.post(f"{API}/products", json={"name": "TEST_RL_Kopi", "category": "TEST", "price": 20000}).json()
    p2 = admin.post(f"{API}/products", json={"name": "TEST_RL_Teh", "category": "TEST", "price": 10000}).json()
    t = admin.post(f"{API}/tables", json={"name": "TEST_RL_T1", "area": "TEST_AREA"}).json()
    d.update(p1=p1["id"], p2=p2["id"], table=t["id"])
    yield d
    for b in admin.get(f"{API}/open-bills").json():
        if any(i["productId"] in (d["p1"], d["p2"]) for i in b["items_json"]):
            admin.post(f"{API}/open-bills/{b['id']}/void", json={"reason": "TEST cleanup"})
    admin.delete(f"{API}/tables/{d['table']}")
    admin.delete(f"{API}/products/{d['p1']}")
    admin.delete(f"{API}/products/{d['p2']}")
    print("CREATED_TRX:", CREATED_TRX)


def mkbill(s, d, **kw):
    body = {"type": "Takeaway", "customerName": "TEST_RL",
            "items": [{"productId": d["p1"], "qty": 3}, {"productId": d["p2"], "qty": 1}], **kw}
    r = s.post(f"{API}/open-bills", json=body)
    assert r.status_code == 200, r.text
    return r.json()


class TestReductionLock:
    def test_kasir_increase_no_pin(self, kasir, data):
        b = mkbill(kasir, data)
        r = kasir.put(f"{API}/open-bills/{b['id']}", json={"type": "Takeaway", "customerName": "TEST_RL",
                      "items": [{"productId": data["p1"], "qty": 4}, {"productId": data["p2"], "qty": 1}]})
        assert r.status_code == 200, r.text
        assert r.json()["total"] == 90000

    @pytest.mark.parametrize("who", ["kasir", "waiter"])
    def test_reduce_without_pin_403(self, who, kasir, waiter, data):
        s = kasir if who == "kasir" else waiter
        b = mkbill(s, data)
        r = s.put(f"{API}/open-bills/{b['id']}", json={"type": "Takeaway", "customerName": "TEST_RL",
                  "items": [{"productId": data["p1"], "qty": 2}, {"productId": data["p2"], "qty": 1}]})
        assert r.status_code == 403, r.text
        # remove item entirely
        r = s.put(f"{API}/open-bills/{b['id']}", json={"type": "Takeaway", "customerName": "TEST_RL",
                  "items": [{"productId": data["p1"], "qty": 3}]})
        assert r.status_code == 403
        assert s.get(f"{API}/open-bills/{b['id']}").json()["total"] == 70000

    def test_reduce_wrong_pin_then_correct(self, kasir, data):
        b = mkbill(kasir, data)
        body = {"type": "Takeaway", "customerName": "TEST_RL", "items": [{"productId": data["p1"], "qty": 1}]}
        r = kasir.put(f"{API}/open-bills/{b['id']}", json={**body, "adminPin": "2222"})
        assert r.status_code == 401, r.text
        r = kasir.put(f"{API}/open-bills/{b['id']}", json={**body, "adminPin": "1234"})
        assert r.status_code == 200, r.text
        g = kasir.get(f"{API}/open-bills/{b['id']}").json()
        assert g["total"] == 20000 and len(g["items_json"]) == 1

    def test_admin_reduce_no_pin(self, admin, data):
        b = mkbill(admin, data)
        r = admin.put(f"{API}/open-bills/{b['id']}", json={"type": "Takeaway", "customerName": "TEST_RL",
                      "items": [{"productId": data["p2"], "qty": 1}]})
        assert r.status_code == 200 and r.json()["total"] == 10000

    def test_pay_fewer_items_kasir_403(self, kasir, data):
        b = mkbill(kasir, data)
        body = {"type": "Takeaway", "method": "QRIS", "openBillId": b["id"], "items": [{"productId": data["p1"], "qty": 3}]}
        r = kasir.post(f"{API}/transactions", json=body)
        assert r.status_code == 403, r.text
        r = kasir.post(f"{API}/transactions", json={**body, "adminPin": "1234"})
        assert r.status_code == 200, r.text
        CREATED_TRX.append(r.json()["id"])
        assert r.json()["total"] == 60000
        assert kasir.get(f"{API}/open-bills/{b['id']}").status_code == 404

    def test_partial_pay_no_pin(self, kasir, data):
        b = mkbill(kasir, data)
        r = kasir.post(f"{API}/transactions", json={"type": "Takeaway", "method": "Cash", "cashGiven": 50000, "partial": True,
                       "openBillId": b["id"], "items": [{"productId": data["p1"], "qty": 1}]})
        assert r.status_code == 200, r.text
        CREATED_TRX.append(r.json()["id"])
        assert r.json()["change"] == 30000
        g = kasir.get(f"{API}/open-bills/{b['id']}").json()
        assert g["total"] == 50000


class TestVoidAndPin:
    def test_waiter_void_requires_pin(self, waiter, data):
        b = mkbill(waiter, data, type="Dine In", tableId=data["table"])
        r = waiter.post(f"{API}/open-bills/{b['id']}/void", json={"reason": "TEST"})
        assert r.status_code == 403
        r = waiter.post(f"{API}/open-bills/{b['id']}/void", json={"reason": "TEST", "adminPin": "9999"})
        assert r.status_code == 401
        r = waiter.post(f"{API}/open-bills/{b['id']}/void", json={"reason": "TEST", "adminPin": "1234"})
        assert r.status_code == 200 and r.json()["authorizedBy"]
        t = next(t for t in waiter.get(f"{API}/tables").json() if t["id"] == data["table"])
        assert t["status"] == "available"

    def test_verify_admin(self, kasir):
        assert kasir.post(f"{API}/auth/verify-admin", json={"pin": "2222"}).status_code == 401
        r = kasir.post(f"{API}/auth/verify-admin", json={"pin": "1234"})
        assert r.status_code == 200 and r.json()["ok"] is True

    def test_waiter_cannot_pay(self, waiter, data):
        r = waiter.post(f"{API}/transactions", json={"type": "Walk In", "method": "QRIS", "items": [{"productId": data["p2"], "qty": 1}]})
        assert r.status_code == 403
