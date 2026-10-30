"""Add general ledger and financial report views.

Revision ID: 0005_finance_module
Revises: 0004_order_time_queue_number
"""
from pathlib import Path

from alembic import op

revision = "0005_finance_module"
down_revision = "0004_order_time_queue_number"
branch_labels = None
depends_on = None


def upgrade():
    sql_path = Path(__file__).resolve().parents[2] / "supabase" / "migrate_finance_module.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade():
    raise RuntimeError("Downgrade dilakukan manual agar jurnal keuangan tidak terhapus")
