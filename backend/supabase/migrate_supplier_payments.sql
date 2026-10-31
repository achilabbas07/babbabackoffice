create table if not exists public.supplier_payments (
  id                  uuid primary key default gen_random_uuid(),
  purchase_id         text not null references public.purchases(id) on delete restrict,
  sumber_dana_akun    varchar not null check (sumber_dana_akun in ('1-10001', '1-10002')),
  jumlah_bayar        numeric(16, 2) not null check (jumlah_bayar > 0),
  created_at          timestamptz not null default now()
);

create index if not exists supplier_payments_purchase_idx
  on public.supplier_payments (purchase_id, created_at desc);

alter table public.supplier_payments enable row level security;
revoke all on table public.supplier_payments from public, anon, authenticated;
