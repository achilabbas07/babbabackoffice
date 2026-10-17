"""Promos, point settings, discount columns on transactions

Revision ID: 0002_promos_points
Revises: 0001_initial_pos_schema
Create Date: 2026-10-16
"""
from alembic import op

revision = "0002_promos_points"
down_revision = "0001_initial_pos_schema"
branch_labels = None
depends_on = None

SQL = """
alter table transactions add column if not exists subtotal integer not null default 0;
alter table transactions add column if not exists discount integer not null default 0;
alter table transactions add column if not exists "promoCode" text;
alter table transactions add column if not exists "promoDiscount" integer not null default 0;
alter table transactions add column if not exists "pointsRedeemed" integer not null default 0;
alter table transactions add column if not exists "pointsDiscount" integer not null default 0;
alter table customers add constraint customers_points_nonneg check (points >= 0);

create or replace function trg_transactions_loyalty() returns trigger language plpgsql as $$
begin
  if new."customerId" is not null then
    update customers set visits = visits + 1, total_spent = total_spent + new.total,
                         points = points + (new.total / 10000) - coalesce(new."pointsRedeemed", 0)
      where id = new."customerId";
  end if;
  return new;
exception when check_violation then
  raise exception 'Poin pelanggan tidak cukup untuk ditukar';
end $$;
"""


def upgrade():
    op.execute(SQL)


def downgrade():
    raise RuntimeError("Downgrade dilakukan manual agar data tidak terhapus")
