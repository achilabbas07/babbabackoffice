create table if not exists public.master_suppliers (
  id            bigserial primary key,
  nama_supplier  varchar not null
);

alter table public.purchases
  add column if not exists supplier_id bigint references public.master_suppliers(id),
  add column if not exists metode_pembayaran text not null default 'cash'
    check (metode_pembayaran in ('cash', 'credit')),
  add column if not exists status_pembayaran text not null default 'lunas'
    check (status_pembayaran in ('belum_lunas', 'lunas')),
  add column if not exists sisa_utang bigint not null default 0
    check (sisa_utang >= 0);

create index if not exists purchases_supplier_id_idx
  on public.purchases (supplier_id);
create index if not exists purchases_unpaid_idx
  on public.purchases (date desc)
  where status_pembayaran = 'belum_lunas';

alter table public.master_suppliers enable row level security;
