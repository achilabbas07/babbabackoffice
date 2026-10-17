# F&B POS — PRD

## Original Problem Statement
Buat arsitektur database untuk F&B POS dengan skema berikut (Products, Tables, Transactions, Customers, Inventory, Recipes, Purchases, Expenses, Users, OpenBills). Pastikan relasi tabel terhubung dengan benar. Aplikasi POS lengkap (kasir, meja, stok, laporan). Stok bahan otomatis berkurang saat transaksi dan bertambah saat purchases. Login PIN untuk admin/kasir/waiter.

Latest request: "Lanjutkan implementasi kode berdasarkan tabel 'menu_variants', 'raw_materials', dan 'variant_ingredients' yang sudah sukses dibuat di Supabase. Tugas Anda HANYA menyambungkan logika database ke tombol Checkout dan melakukan perbaikan bug visual jika ada. Dilarang keras menyalakan fitur Agen Pengujian Otomatis..."

## Architecture
- FastAPI + React, PostgreSQL (Supabase, transaction pooler) via `pgdb.py` (Mongo-like wrapper over asyncpg).
- Inventory stock deduction/addition & loyalty via Supabase triggers (transactions/purchases insert).
- Variant raw materials handled in `backend/variants.py` (check before insert, deduct after transaction insert).

## Implemented
- POS core, tables canvas (merge/split/move), Admin PIN auth, shifts (blind close), waiter targets, promos & points, Supabase migration.
- 2026-10-17: Menu variants wired to checkout
  - POS now loads `/api/menu-variants` (previously never loaded → dialog never opened).
  - `/api/menu-variants` returns `available` (max portions from raw_materials + variant stock).
  - Checkout/open bill: validates variant stock & raw materials (blocks with message), deducts `raw_materials.stock_quantity` and `menu_variants.stock` (if not null).
  - Split bill, merge, reduction auth now keyed by product+variant (variants no longer lost).
  - Variant name shown in receipt, kitchen ticket, open bills, table detail, split bill.
  - Cart blocks adding beyond available variant stock with toast warning.

- 2026-10-17: Variants fetched per clicked product: frontend strips "PRD-" → integer, calls `GET /api/menu-variants?menu_id=<int>`. Note: Supabase row variant id=34 currently has menu_id=10 (Aneka Kue), not 34 (Kentang Goreng) — user data needs correction.

## Backlog
- P1: Admin UI to manage variants / raw materials / variant ingredients (currently via Supabase dashboard).
- P2: Purchases for raw_materials (restock flow).
