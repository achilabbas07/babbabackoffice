"""Persist original order time and string queue numbers.

Revision ID: 0004_order_time_queue_number
Revises: 0003_checkout_rpc_stock
"""
from alembic import op

revision = "0004_order_time_queue_number"
down_revision = "0003_checkout_rpc_stock"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        alter table public.open_bills
          add column if not exists "queueNumber" text;
        alter table public.open_bills
          alter column "queueNumber" type text using "queueNumber"::text;

        alter table public.transactions
          add column if not exists "queueNumber" text;
        alter table public.transactions
          alter column "queueNumber" type text using "queueNumber"::text;
        alter table public.transactions
          add column if not exists "orderTime" timestamptz;
        update public.transactions
          set "orderTime" = date
          where "orderTime" is null;
    """)


def downgrade():
    raise RuntimeError("Downgrade dilakukan manual agar data waktu/nomor urut tidak hilang")
