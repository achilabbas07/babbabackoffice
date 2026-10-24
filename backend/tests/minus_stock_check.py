import asyncio
import os

import asyncpg
import httpx
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
API = "http://localhost:8001/api"
PID = "PRD-015"


async def main():
    c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    rec = await c.fetch('select "inventoryId" from recipes where "productId"=$1', PID)
    inv_ids = [r["inventoryId"] for r in rec]
    before = {r["id"]: r["stock"] for r in await c.fetch("select id, stock from inventory where id = any($1::text[])", inv_ids)}
    trx = None
    await c.execute("update inventory set stock=10 where id='INV-003'")
    try:
        h = httpx.Client(base_url=API, timeout=30)
        tok = h.post("/auth/login", json={"userId": "USR-ADMIN", "pin": "1234"}).json()["token"]
        hd = {"Authorization": f"Bearer {tok}"}
        st = h.get("/products/stock", headers=hd).json()
        print("STOCK PRD-015", st.get(PID), "| minus products", [k for k, v in st.items() if v <= 0][:5])
        r = h.post("/transactions", json={"type": "Takeaway", "method": "Cash", "cashGiven": 1000000,
                                          "items": [{"productId": PID, "qty": 3, "notes": "", "variantId": None}]}, headers=hd)
        print("CHECKOUT", r.status_code, r.text[:160])
        if r.status_code == 200:
            trx = r.json()["id"]
        after = {r["id"]: r["stock"] for r in await c.fetch("select id, stock from inventory where id = any($1::text[])", inv_ids)}
        print("BEFORE", before)
        print("AFTER ", after)
    finally:
        if trx:
            await c.execute("delete from transactions where id=$1", trx)
            await c.execute('delete from order_logs where "refId"=$1', trx)
        for k, v in before.items():
            await c.execute("update inventory set stock=$1 where id=$2", v, k)
        await c.close()
        print("CLEANED", trx)

asyncio.run(main())
