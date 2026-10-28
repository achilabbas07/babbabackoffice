"""Use checkout RPC instead of the legacy transaction stock trigger.

Revision ID: 0003_checkout_rpc_stock
Revises: 0002_promos_points
"""
from alembic import op

revision = "0003_checkout_rpc_stock"
down_revision = "0002_promos_points"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("drop trigger if exists transactions_consume_stock on transactions")
    op.execute("drop function if exists trg_transactions_consume_stock()")


def downgrade():
    raise RuntimeError("Downgrade dilakukan manual agar logika stok tidak aktif kembali")
