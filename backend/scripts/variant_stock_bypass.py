import asyncio
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

SQL = """
drop trigger if exists transactions_consume_stock on transactions;
drop function if exists trg_transactions_consume_stock();
"""


async def main():
    c = await asyncpg.connect(os.environ["DATABASE_URL"], statement_cache_size=0)
    await c.execute(SQL)
    await c.close()
    print("Legacy transaction stock trigger removed")

asyncio.run(main())
