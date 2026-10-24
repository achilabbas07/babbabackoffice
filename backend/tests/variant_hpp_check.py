import asyncio
import os

import asyncpg
import httpx
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
API = "http://localhost:8001/api"


async def main():
    c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    inv_before = {r["id"]: r["stock"] for r in await c.fetch("select id, stock from inventory")}
    trx = None
    try:
        h = httpx.Client(base_url=API, timeout=30)
        tok = h.post("/auth/login", json={"userId": "USR-ADMIN", "pin": "1234"}).json()["token"]
        items = [{"productId": "PRD-002", "qty": 1, "notes": "", "variantId": 60},
                 {"productId": "PRD-028", "qty": 1, "notes": "", "variantId": 32},
                 {"productId": "PRD-010", "qty": 1, "notes": "", "variantId": None}]
        r = h.post("/transactions", json={"type": "Takeaway", "method": "Cash", "cashGiven": 1000000, "items": items},
                   headers={"Authorization": f"Bearer {tok}"})
        print("CHECKOUT", r.status_code)
        if r.status_code == 200:
            trx = r.json()["id"]
            for i in r.json()["items_json"]:
                print(i["variantName"] or i["productName"], "hpp", i["hpp"])
        else:
            print(r.text)
        print("PRD-010 base hpp", await c.fetchval("select hpp from products where id='PRD-010'"))
    finally:
        if trx:
            await c.execute("delete from transactions where id=$1", trx)
            await c.execute('delete from order_logs where "refId"=$1', trx)
        for k, v in inv_before.items():
            await c.execute("update inventory set stock=$1 where id=$2 and stock<>$1", v, k)
        await c.close()
        print("CLEANED", trx)

asyncio.run(main())
