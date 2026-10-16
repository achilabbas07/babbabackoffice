"""Initial POS schema (tables, relations, stock/HPP/loyalty triggers)

Revision ID: 0001_initial_pos_schema
Revises:
Create Date: 2026-10-16
"""
from pathlib import Path

from alembic import op

revision = "0001_initial_pos_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute((Path(__file__).resolve().parents[2] / "supabase" / "schema.sql").read_text())


def downgrade():
    raise RuntimeError("Downgrade skema awal dilakukan manual agar data tidak terhapus")
