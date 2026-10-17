# Discounts (promo + points) tests against REAL Supabase - minimal writes (1 transaction max)
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
CREATED = []


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"userId": "USR-ADMIN", "pin": "1234"}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


def cust_points(client, cid):
    r = client.get(f"{BASE_URL}/api/customers", timeout=30)
    assert r.status_code == 200
    return next(c for c in r.json() if c["id"] == cid)["points"]


# Promo check endpoint
class TestPromo:
    def test_promo_valid(self, client):
        r = client.post(f"{BASE_URL}/api/discounts/promo", json={"code": "test10", "subtotal": 50000, "adminPin": "1234"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"].upper() == "TEST10" and d["discount"] == 5000

    def test_promo_min_order(self, client):
        r = client.post(f"{BASE_URL}/api/discounts/promo", json={"code": "TEST10", "subtotal": 20000, "adminPin": "1234"}, timeout=30)
        assert r.status_code == 400, r.text
        assert "Minimal" in r.json()["detail"]

    def test_promo_unknown(self, client):
        r = client.post(f"{BASE_URL}/api/discounts/promo", json={"code": "TEST_NOPE", "subtotal": 50000, "adminPin": "1234"}, timeout=30)
        assert r.status_code == 404, r.text

    def test_promo_wrong_pin_once(self, client):
        r = client.post(f"{BASE_URL}/api/discounts/promo", json={"code": "TEST10", "subtotal": 50000, "adminPin": "9999"}, timeout=30)
        assert r.status_code == 401, r.text
        # reset counter with a correct PIN call
        client.post(f"{BASE_URL}/api/discounts/promo", json={"code": "TEST10", "subtotal": 50000, "adminPin": "1234"}, timeout=30)

    def test_promo_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/discounts/promo", json={"code": "TEST10", "subtotal": 50000, "adminPin": "1234"}, timeout=30)
        assert r.status_code in (401, 403)


# Points check endpoint
class TestPoints:
    def test_points_ok(self, client):
        r = client.post(f"{BASE_URL}/api/discounts/points", json={"customerId": "CUST-TEST1", "adminPin": "1234"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["discount"] == 10000 and d["pointsRequired"] == 100

    def test_points_insufficient(self, client):
        r = client.post(f"{BASE_URL}/api/discounts/points", json={"customerId": "CUST-004", "adminPin": "1234"}, timeout=30)
        assert r.status_code == 400, r.text
        assert "tidak cukup" in r.json()["detail"]

    def test_points_unknown_customer(self, client):
        r = client.post(f"{BASE_URL}/api/discounts/points", json={"customerId": "CUST-NOPE", "adminPin": "1234"}, timeout=30)
        assert r.status_code == 404


# Transaction with discounts (PRD-002 real = Kopi Susu Besar 13000 -> 4x = 52000)
class TestTransactionDiscount:
    payload = {"type": "Walk In", "method": "Cash", "customerId": "CUST-TEST1", "customerName": "TEST_Disc",
               "items": [{"productId": "PRD-002", "qty": 4}], "cashGiven": 50000,
               "promoCode": "TEST10", "redeemPoints": True}

    def test_no_pin_403(self, client):
        r = client.post(f"{BASE_URL}/api/transactions", json=self.payload, timeout=60)
        assert r.status_code == 403, r.text

    def test_trx_with_discounts(self, client):
        before = cust_points(client, "CUST-TEST1")
        print("points before", before)
        r = client.post(f"{BASE_URL}/api/transactions", json={**self.payload, "discountPin": "1234"}, timeout=90)
        assert r.status_code == 200, r.text
        t = r.json()
        CREATED.append(t["id"])
        print("CREATED TRX", t["id"])
        assert t["subtotal"] == 52000
        assert t["promoDiscount"] == 5200
        assert t["pointsDiscount"] == 10000
        assert t["pointsRedeemed"] == 100
        assert t["discount"] == 15200
        assert t["total"] == 36800
        assert t["change"] == 13200
        after = cust_points(client, "CUST-TEST1")
        print("points after", after)
        assert after == before - 100 + 36800 // 10000
        g = client.get(f"{BASE_URL}/api/transactions/{t['id']}", timeout=30)
        assert g.status_code == 200 and g.json()["total"] == 36800 and g.json()["promoCode"] == "TEST10"
