import asyncio
import os

import asyncpg
import httpx
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
API = "http://localhost:8001/api"


async def main():
    c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    h = httpx.Client(base_url=API, timeout=30)
    tok = h.post("/auth/login", json={"userId": "USR-ADMIN", "pin": "1234"}).json()["token"]
    hd = {"Authorization": f"Bearer {tok}"}
    had_shift = h.get("/shifts/current", headers=hd).json()["shift"]
    opened = None
    if not had_shift:
        opened = h.post("/shifts/open", json={"openingCash": 100000}, headers=hd).json()["id"]
    created = []
    try:
        print("CATS", h.get("/expense-categories", headers=hd).json()[:2])
        r = h.post("/shifts/cash-movements", json={"type": "out", "amount": 5000, "note": "TEST_tanpa_kategori"}, headers=hd)
        print("OUT NO CAT", r.status_code, r.text)
        r = h.post("/shifts/cash-movements", json={"type": "out", "amount": 5000, "note": "TEST_es_batu", "expense_category_id": 2}, headers=hd)
        print("OUT CAT", r.status_code, r.text)
        created.append(r.json().get("id"))
        r = h.post("/shifts/cash-movements", json={"type": "in", "amount": 2000, "note": "TEST_kas_masuk"}, headers=hd)
        print("IN", r.status_code, r.text)
        created.append(r.json().get("id"))
        print("DB", [dict(x) for x in await c.fetch("select id,type,amount,note,expense_category_id from cash_movements where note like 'TEST_%'")])
    finally:
        await c.execute("delete from cash_movements where note like 'TEST_%'")
        if opened:
            await c.execute("delete from shifts where id=$1", opened)
        await c.close()
        print("CLEANED", created, opened)

asyncio.run(main())
