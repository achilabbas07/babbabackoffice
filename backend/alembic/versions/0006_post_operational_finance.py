"""Post operational sales, purchases, and expenses to the general ledger.

Revision ID: 0006_post_operational_finance
Revises: 0005_finance_module
"""
from pathlib import Path

from alembic import op

revision = "0006_post_operational_finance"
down_revision = "0005_finance_module"
branch_labels = None
depends_on = None


def upgrade():
    sql_path = Path(__file__).resolve().parents[2] / "supabase" / "migrate_finance_postings.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade():
    raise RuntimeError("Downgrade dilakukan manual agar jurnal keuangan tidak terhapus")
