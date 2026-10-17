# Supabase-backed POS: read-only regression (auth, role access, all list endpoints). Minimal writes (none).
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def login(uid, pin):
    r = requests.post(f"{API}/auth/login", json={"userId": uid, "pin": pin}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def admin():
    return login("USR-ADMIN", "1234")


@pytest.fixture(scope="module")
def kasir():
    return login("USR-KASIR", "2222")


@pytest.fixture(scope="module")
def waiter():
    return login("USR-WAITER", "3333")


# Auth
def test_public_users_no_pin():
    r = requests.get(f"{API}/auth/users", timeout=30)
    assert r.status_code == 200
    data = r.json()
    ids = {u["id"] for u in data}
    assert {"USR-ADMIN", "USR-KASIR", "USR-WAITER"} <= ids
    assert all("pin" not in u for u in data)


def test_me(admin):
    r = requests.get(f"{API}/auth/me", headers=admin, timeout=30)
    assert r.status_code == 200 and r.json()["role"] == "admin"


def test_no_token_401():
    assert requests.get(f"{API}/products", timeout=30).status_code == 401


# Admin list endpoints
@pytest.mark.parametrize("path", ["products", "tables", "open-bills", "transactions", "customers", "inventory",
                                  "recipes", "purchases", "expenses", "users", "users/waiters", "shifts",
                                  "reports/summary?start=2026-01-01T00:00:00Z&end=2026-12-31T23:59:59Z", "schema", "shifts/current"])
def test_admin_lists(admin, path):
    r = requests.get(f"{API}/{path}", headers=admin, timeout=60)
    assert r.status_code == 200, f"{path}: {r.status_code} {r.text[:300]}"


def test_targets_admin(admin):
    r = requests.get(f"{API}/targets", headers=admin, timeout=60)
    assert r.status_code == 200, r.text[:300]


# Role restrictions
def test_kasir_no_inventory(kasir):
    assert requests.get(f"{API}/inventory", headers=kasir, timeout=30).status_code == 403


def test_waiter_no_transactions_create(waiter):
    r = requests.post(f"{API}/transactions", headers=waiter, json={"type": "Walk In", "method": "Cash", "items": [],
                                                                   "cashGiven": 0}, timeout=30)
    assert r.status_code in (403, 422)


def test_products_have_ojol_price(admin):
    prods = requests.get(f"{API}/products", headers=admin, timeout=30).json()
    p = next(x for x in prods if x["id"] == "PRD-003")
    assert p["price"] > 0 and "price_ojol" in p


def test_recipe_americano(admin):
    r = requests.get(f"{API}/products/PRD-003/recipes", headers=admin, timeout=30)
    assert r.status_code == 200
    print(r.json())
