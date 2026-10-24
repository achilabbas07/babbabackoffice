import asyncio
import os

import asyncpg
import httpx
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
API = "http://localhost:8001/api"


async def main():
    c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    print("COL TYPE", await c.fetchval("select data_type from information_schema.columns where table_name='variant_ingredients' and column_name='inventory_id'"))
    ing = await c.fetch("select inventory_id, qty_needed from variant_ingredients where variant_id=55")
    ids = [r["inventory_id"] for r in ing]
    before = {r["id"]: r["stock"] for r in await c.fetch("select id, stock from inventory where id = any($1::text[])", ids)}
    trx = None
    try:
        h = httpx.Client(base_url=API, timeout=30)
        tok = h.post("/auth/login", json={"userId": "USR-ADMIN", "pin": "1234"}).json()["token"]
        r = h.post("/transactions", json={"type": "Takeaway", "method": "Cash", "cashGiven": 1000000,
                                          "items": [{"productId": "PRD-015", "qty": 2, "notes": "", "variantId": 55}]},
                   headers={"Authorization": f"Bearer {tok}"})
        print("CHECKOUT", r.status_code, r.text[:120])
        if r.status_code == 200:
            trx = r.json()["id"]
            print("ITEM", {k: r.json()["items_json"][0][k] for k in ("productName", "variantName", "price")})
        print("LOGS", [dict(x) for x in await c.fetch('select "productName", qty, variant_id from order_logs where "refId"=$1', trx)])
        print("BEFORE", before)
        print("AFTER ", {r["id"]: r["stock"] for r in await c.fetch("select id, stock from inventory where id = any($1::text[])", ids)})
    finally:
        if trx:
            await c.execute("delete from transactions where id=$1", trx)
            await c.execute('delete from order_logs where "refId"=$1', trx)
        for k, v in before.items():
            await c.execute("update inventory set stock=$1 where id=$2", v, k)
        await c.execute("update inventory set stock=250 where id='INV-003'")
        await c.close()
        print("CLEANED", trx)

asyncio.run(main())
