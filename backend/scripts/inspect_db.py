import asyncio, asyncpg, os
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")


async def m():
    c = await asyncpg.connect(os.environ['DATABASE_URL'], statement_cache_size=0)
    for t in ['menu_variants', 'variant_ingredients', 'inventory', 'raw_materials', 'order_logs']:
        rows = await c.fetch("select column_name,data_type from information_schema.columns where table_name=$1 and table_schema='public' order by ordinal_position", t)
        print(t, [(r[0], r[1]) for r in rows])
    print(await c.fetch("select type, count(*) from inventory group by type"))
    print(await c.fetch("select id,name,type,unit,stock from inventory limit 5"))
    print(await c.fetchval("select pg_get_functiondef('public.kurangi_stok_bahan'::regproc)"))
    print(await c.fetch("select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.variant_ingredients'::regclass"))
    await c.close()

asyncio.run(m())
