import asyncio
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

SQL = """
create or replace function trg_transactions_consume_stock() returns trigger language plpgsql as $$
declare it jsonb; v_qty numeric; v_pid text;
begin
  for it in select * from jsonb_array_elements(new.items_json) loop
    if it->>'variantId' is not null then continue; end if;
    v_pid := it->>'productId';
    v_qty := (it->>'qty')::numeric;
    if exists (select 1 from recipes where "productId" = v_pid) then
      update inventory i set stock = i.stock - r.qty_needed * v_qty
        from recipes r where r."productId" = v_pid and i.id = r."inventoryId";
    else
      update inventory set stock = stock - v_qty
        where id = (select "inventoryId" from products where id = v_pid);
    end if;
  end loop;
  return new;
exception when check_violation then
  raise exception 'Stok bahan tidak cukup untuk transaksi %', new.id;
end $$;
"""


async def main():
    c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    await c.execute(SQL)
    await c.close()
    print("ok")

asyncio.run(main())
