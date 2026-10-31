"""Add supplier links and purchase account-payable tracking.

Revision ID: 0007_purchase_account_payable
Revises: 0006_post_operational_finance
"""
from pathlib import Path

from alembic import op

revision = "0007_purchase_account_payable"
down_revision = "0006_post_operational_finance"
branch_labels = None
depends_on = None


def upgrade():
    sql_path = Path(__file__).resolve().parents[2] / "supabase" / "migrate_purchase_account_payable.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade():
    raise RuntimeError("Downgrade dilakukan manual agar data supplier dan utang tidak hilang")
