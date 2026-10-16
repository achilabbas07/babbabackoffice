# T1 UI seed: creates TEST_ data for UI tests (run: python t1_ui_seed.py seed|clean). IDs saved to /tmp/t1_seed.json
import json, sys, requests

BASE = [l.split("=", 1)[1].strip() for l in open("/app/frontend/.env") if l.startswith("REACT_APP_BACKEND_URL")][0] + "/api"


def sess(pin):
    r = requests.post(f"{BASE}/auth/login", json={"pin": pin}); r.raise_for_status()
    s = requests.Session(); s.headers["Authorization"] = "Bearer " + r.json()["token"]; return s


a = sess("1234")
if sys.argv[1] == "seed":
    k = sess("2222")
    d = {}
    inv = a.post(f"{BASE}/inventory", json={"name": "TEST_T1Bahan", "type": "bahan", "stock": 500, "unit": "gr", "cost_per_unit": 100}).json()
    d["inv"] = inv["id"]
    prods = []
    for i, (n, p, o) in enumerate([("TEST_T1Kopi", 20000, 25000), ("TEST_T1Teh", 10000, 0), ("TEST_T1Roti", 15000, 18000),
                                   ("TEST_T1Jus", 18000, 0), ("TEST_T1Mie", 22000, 26000), ("TEST_T1Nasi", 25000, 0), ("TEST_T1Soda", 8000, 0)]):
        pr = a.post(f"{BASE}/products", json={"name": n, "category": "TEST_T1", "price": p, "price_ojol": o}).json()
        prods.append(pr["id"])
    a.put(f"{BASE}/products/{prods[0]}/recipes", json=[{"inventoryId": inv["id"], "qty_needed": 10}])
    d["prods"] = prods
    d["tables"] = [a.post(f"{BASE}/tables", json={"name": f"TEST_UT{i}", "area": "TEST_ZONE"}).json()["id"] for i in range(1, 5)]
    d["cust"] = a.post(f"{BASE}/customers", json={"name": "TEST_T1Cust", "wa": "0811"}).json()["id"]
    d["bills"] = []
    for i, name in enumerate(["TEST_B1", "TEST_B2"]):
        b = k.post(f"{BASE}/open-bills", json={"type": "Dine In", "tableId": d["tables"][i], "customerName": name,
                   "items": [{"productId": prods[0], "qty": 2}, {"productId": prods[1], "qty": 1}]}).json()
        d["bills"].append(b["id"])
    json.dump(d, open("/tmp/t1_seed.json", "w"))
    print(d)
else:
    d = json.load(open("/tmp/t1_seed.json"))
    for b in a.get(f"{BASE}/open-bills").json():
        if b.get("tableId") in d["tables"] or any(i["productId"] in d["prods"] for i in b["items_json"]):
            print("void", b["id"], a.post(f"{BASE}/open-bills/{b['id']}/void", json={"reason": "TEST cleanup"}).status_code)
    for t in d["tables"]:
        print(t, a.delete(f"{BASE}/tables/{t}").status_code)
    for p in d["prods"]:
        a.delete(f"{BASE}/products/{p}")
    print(a.delete(f"{BASE}/inventory/{d['inv']}").status_code, a.delete(f"{BASE}/customers/{d['cust']}").status_code)
