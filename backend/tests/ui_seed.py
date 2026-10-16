# UI test helper: `python ui_seed.py seed` creates TEST_ data (TEST_AREA tables, products, inventory, customer, bills); `cleanup` removes it
import json
import os
import sys
import requests

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
s = requests.Session()
s.headers["Authorization"] = "Bearer " + requests.post(f"{API}/auth/login", json={"pin": "1234"}).json()["token"]
STATE = "/tmp/ui_seed.json"


def seed():
    inv = s.post(f"{API}/inventory", json={"name": "TEST_UIBahan", "type": "bahan", "stock": 500, "unit": "pcs", "cost_per_unit": 1000}).json()
    low = s.post(f"{API}/inventory", json={"name": "TEST_UILow", "type": "bahan", "stock": 1, "unit": "pcs", "cost_per_unit": 100, "min_stock": 5}).json()
    prods = []
    for i, (n, pr, oj) in enumerate([("TEST_UIKopi", 20000, 26000), ("TEST_UITeh", 10000, 0), ("TEST_UIRoti", 15000, 18000),
                                     ("TEST_UIJus", 12000, 0), ("TEST_UIMie", 18000, 0), ("TEST_UINasi", 22000, 0), ("TEST_UISoda", 8000, 0)]):
        p = s.post(f"{API}/products", json={"name": n, "category": "TESTCAT", "price": pr, "price_ojol": oj}).json()
        s.put(f"{API}/products/{p['id']}/recipes", json=[{"inventoryId": inv["id"], "qty_needed": 1}])
        prods.append(p["id"])
    tables = [s.post(f"{API}/tables", json={"name": f"TEST_M{i}", "area": "TEST_AREA"}).json()["id"] for i in range(1, 6)]
    fx = s.post(f"{API}/tables", json={"name": "TEST_KASIR", "area": "TEST_AREA", "kind": "fixture"}).json()["id"]
    cust = s.post(f"{API}/customers", json={"name": "TEST_UICust"}).json()["id"]
    bills = []
    for t, items in [(tables[0], [(prods[0], 2), (prods[1], 1)]), (tables[1], [(prods[2], 1)])]:
        b = s.post(f"{API}/open-bills", json={"type": "Dine In", "tableId": t, "items": [{"productId": p, "qty": q} for p, q in items]}).json()
        bills.append(b["id"])
    st = {"inv": [inv["id"], low["id"]], "prods": prods, "tables": tables + [fx], "fixture": fx, "cust": cust, "bills": bills}
    json.dump(st, open(STATE, "w"))
    print(json.dumps(st))


def cleanup():
    st = json.load(open(STATE))
    for b in s.get(f"{API}/open-bills").json():
        if b.get("tableId") in st["tables"] or any(i["productId"] in st["prods"] for i in b["items_json"]):
            print("void", b["id"], s.post(f"{API}/open-bills/{b['id']}/void", json={"reason": "TEST cleanup"}).status_code)
    for t in st["tables"]:
        print("tbl", t, s.delete(f"{API}/tables/{t}").status_code)
    for p in st["prods"]:
        s.delete(f"{API}/products/{p}")
    for i in st["inv"]:
        print("inv", i, s.delete(f"{API}/inventory/{i}").status_code)
    s.delete(f"{API}/customers/{st['cust']}")
    for u in s.get(f"{API}/users").json():
        if u["name"].startswith("TEST_"):
            s.delete(f"{API}/users/{u['id']}")
    for e in s.get(f"{API}/expenses").json():
        if e["description"].startswith("TEST_"):
            s.delete(f"{API}/expenses/{e['id']}")


if __name__ == "__main__":
    seed() if sys.argv[1] == "seed" else cleanup()
