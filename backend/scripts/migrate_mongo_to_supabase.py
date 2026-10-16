"""One-time copy of existing MongoDB data into Supabase Postgres tables."""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from pgdb import PGDatabase  # noqa: E402

ORDER = ["users", "inventory", "products", "recipes", "customers", "tables", "shifts", "waiter_shifts", "open_bills",
         "transactions", "purchases", "expenses", "cash_movements", "void_logs", "sales_targets", "order_logs", "counters", "meta"]
FKS = {
    "products": {"inventoryId": "inventory"},
    "open_bills": {"userId": "users", "waiterId": "users", "tableId": "tables", "customerId": "customers"},
    "transactions": {"userId": "users", "waiterId": "users", "tableId": "tables", "customerId": "customers", "shiftId": "shifts"},
    "purchases": {"userId": "users"}, "expenses": {"userId": "users"}, "shifts": {"userId": "users"},
    "cash_movements": {"userId": "users"}, "void_logs": {"tableId": "tables"}, "sales_targets": {"waiterId": "users"},
    "waiter_shifts": {"userId": "users"}, "order_logs": {"shiftId": "waiter_shifts"},
}
TRIGGER_TABLES = ["transactions", "purchases", "recipes", "inventory"]


async def main():
    mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    pg = PGDatabase(os.environ["DATABASE_URL"])
    await pg.connect()
    ids = {}
    for t in TRIGGER_TABLES:
        await pg.pool.execute(f'alter table "{t}" disable trigger user')
    try:
        for name in ORDER:
            cols = pg.columns[name]
            n = skipped = 0
            async for doc in mongo[name].find({}):
                if name == "recipes" and (doc["productId"] not in ids["products"] or doc["inventoryId"] not in ids["inventory"]):
                    skipped += 1
                    continue
                for col, ref in FKS.get(name, {}).items():
                    if doc.get(col) and doc[col] not in ids.get(ref, set()):
                        doc[col] = None
                pk = "identifier" if name == "login_attempts" else "id"
                row = {k: v for k, v in doc.items() if (k == "_id" and name != "recipes") or k in cols}
                if pk in cols and await pg[name].find_one({"_id": row.get("_id")} if "_id" in row else {"productId": row["productId"], "inventoryId": row["inventoryId"]}):
                    ids.setdefault(name, set()).add(row.get("_id"))
                    continue
                await pg[name].insert_one(row)
                ids.setdefault(name, set()).add(row.get("_id"))
                n += 1
            print(f"{name}: {n} disalin, {skipped} dilewati")
    finally:
        for t in TRIGGER_TABLES:
            await pg.pool.execute(f'alter table "{t}" enable trigger user')
    await pg.close()


asyncio.run(main())
