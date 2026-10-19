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
    mid = await c.fetchval("insert into raw_materials(material_name, stock) values('TEST_Bahan', 100) returning id")
    vid = await c.fetchval("insert into menu_variants(product_id, variant_name, additional_price) values($1,'TEST_Large',5000) returning id", PID)
    await c.execute("insert into variant_ingredients(variant_id, material_id, qty_needed) values($1,$2,10)", vid, mid)
    inv_before = await c.fetchval("select stock from inventory where id='INV-003'")
    trx_ids = []
    try:
        async with httpx.AsyncClient(timeout=30) as h:
            tok = (await h.post(f"{API}/auth/login", json={"userId": "USR-ADMIN", "pin": "1234"})).json()["token"]
            hd = {"Authorization": f"Bearer {tok}"}
            print("VARIANTS", (await h.get(f"{API}/menu-variants", params={"product_id": PID}, headers=hd)).json())
            print("NO VARIANTS", (await h.get(f"{API}/menu-variants", params={"product_id": "PRD-001"}, headers=hd)).json())
            body = {"type": "Takeaway", "method": "Cash", "cashGiven": 1000000, "items": [{"productId": PID, "qty": 2, "notes": "", "variantId": vid}]}
            r = await h.post(f"{API}/transactions", json=body, headers=hd)
            print("CHECKOUT VARIANT", r.status_code, r.text[:300])
            if r.status_code == 200:
                trx_ids.append(r.json()["id"])
                print("ITEM", r.json()["items_json"][0]["price"], r.json()["total"])
            print("RAW STOCK", await c.fetchval("select stock from raw_materials where id=$1", mid), "(harus 80)")
            print("INV-003", inv_before, "->", await c.fetchval("select stock from inventory where id='INV-003'"), "(harus sama)")
            print("LOGS", [dict(x) for x in await c.fetch("select \"productId\",qty,source,variant_id from order_logs where variant_id=$1", vid)])
            body["items"] = [{"productId": PID, "qty": 1, "notes": "", "variantId": None}]
            r = await h.post(f"{API}/transactions", json=body, headers=hd)
            print("CHECKOUT REGULAR", r.status_code, r.text[:200])
            if r.status_code == 200:
                trx_ids.append(r.json()["id"])
            print("INV-003 after regular", await c.fetchval("select stock from inventory where id='INV-003'"), "(harus berkurang)")
    finally:
        for t in trx_ids:
            await c.execute("delete from transactions where id=$1", t)
            await c.execute("delete from order_logs where \"refId\"=$1", t)
        await c.execute("update inventory set stock=$1 where id='INV-003'", inv_before)
        await c.execute("delete from order_logs where variant_id=$1", vid)
        await c.execute("delete from variant_ingredients where variant_id=$1", vid)
        await c.execute("delete from menu_variants where id=$1", vid)
        await c.execute("delete from raw_materials where id=$1", mid)
        await c.close()
        print("CLEANED", trx_ids)

asyncio.run(main())
