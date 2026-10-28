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

- 2026-10-17: Variant display format changed to "Nama Menu Nama Varian" (no parentheses) across cart, receipt, kitchen ticket, open bills, table detail, split bill.

- 2026-10-18: Expenses form uses "Kategori Pengeluaran" dropdown from Supabase `expense_categories` (GET /api/expense-categories). POST /api/expenses now takes `category_id` (int, validated) and stores both `category_id` and category name in `expenses`.

- 2026-10-18: Profil Usaha page (/profile, admin) edits `app_profile` via GET/PUT /api/app-profile, including app_name, logo_url, address, phone, additional_info, printerDapur, printerKasir, and cetakOtomatis. Header/sidebar brand, receipt (Struk), Bill and Kitchen ticket headers use profile name + logo (Coffee icon fallback when empty/broken).

- Shift Gate provides Bluetooth printer setup for cashier and kitchen printers; authenticated roles update only the selected printer name through PUT /api/app-profile/printers.

- 2026-10-18: Profil Usaha extended: address, phone, additional_info. Receipt (paid) header: logo, name, address, phone; footer: additional_info + "Terima Kasih Atas Kunjungan Anda". Unpaid Bill print: same header + additional_info (no thank-you). Kitchen ticket header only "ORDER DAPUR" (bold uppercase).

## Backlog
- P1: Admin UI to manage variants / raw materials / variant ingredients (currently via Supabase dashboard).
- P2: Purchases for raw_materials (restock flow).

## 2026-10-19 — Dynamic Branding
- Endpoint publik `GET /api/app-profile/branding` (app_name, logo_url) untuk halaman Login sebelum login.
- ProfileContext memuat branding saat aplikasi dibuka; `document.title` mengikuti nama usaha; fallback "POS Warkop Babba" + ikon logo bawaan.
- Login & Header (desktop/mobile) memakai nama + logo dari database. Diverifikasi via screenshot (tanpa testing agent sesuai permintaan user).

## 2026-10-19 — Varian hibrida (skema Supabase baru)
- menu_variants kini pakai `product_id` (text); raw_materials pakai `stock`. Endpoint `GET /api/menu-variants?product_id=`.
- Checkout: item tanpa variantId → logika stok lama (cek resep + trigger transactions_consume_stock). Item dengan variantId → dilewati dari logika lama (trigger transaksi di-skip untuk variantId), lalu INSERT order_logs (source=variant_sale, variant_id) → trigger `kurangi_stok_bahan` memotong raw_materials.
- Skrip trigger: backend/scripts/variant_stock_bypass.py; cek e2e: backend/tests/variant_checkout_check.py (data TEST dibersihkan otomatis).

## 2026-10-19 — Admin - Tambah Varian
- Tombol "Tambah Varian" di halaman Produk & Resep → modal `VariantAdminDialog.jsx` (pilih menu, nama varian, harga tambahan, baris bahan baku dinamis + "Tambah Bahan").
- Backend: `GET /api/raw-materials`, `POST /api/menu-variants` (admin) — INSERT menu_variants RETURNING id lalu loop INSERT variant_ingredients dalam satu transaksi Postgres (gagal = semua dibatalkan).


## 2026-10-19 — raw_materials dihapus, varian pakai inventory
- Form Tambah Varian: dropdown bahan dari `GET /api/inventory` difilter type = 'Bahan Baku'; simpan ke variant_ingredients.inventory_id.
- Ketersediaan & validasi stok varian kini dari tabel inventory.
- Keranjang: tampilkan variantName saja bila ada, selain itu nama produk (hanya tampilan; payload checkout tidak berubah).
- PENDING (user): ubah tipe variant_ingredients.inventory_id dari bigint → text (ID inventory = 'INV-xxx'), lalu uji simpan varian + checkout varian.

## 2026-10-19 — Kategori di Kas Keluar
- Modal Kas Keluar (Kas & Shift) punya dropdown wajib "Kategori Pengeluaran" dari tabel expense_categories; payload POST /api/shifts/cash-movements menyertakan expense_category_id (wajib untuk type=out, divalidasi backend). Kas Masuk & rumus saldo shift tidak diubah.
- GET /api/expense-categories kini bisa diakses admin + kasir.

## 2026-10-19 — Pencarian pelanggan di Kasir
- Dropdown Pelanggan di keranjang diganti combobox bisa dicari (CustomerCombobox.jsx; cari nama/no. HP).

## 2026-10-19 — Halaman Pelanggan 2 kolom
- Layout 70/30 (lg:grid-cols-[7fr_3fr]); kiri tabel lama tanpa perubahan fungsi, kanan card "10 Pelanggan Terbaik" (TopCustomers.jsx).
- `GET /api/customers/top`: total_spent > 0, ORDER BY total_spent DESC, points DESC, LIMIT 10 (read-only). Di HP card turun ke bawah tabel.

## 2026-10-24 — Floor plan touch-friendly, nama varian, stok minus, print ulang shift
- Floor plan: CELL 116→180, TILE 98→160, ikon & font diperbesar (posisi grid x/y tidak berubah).
- itemName = variantName || productName (keranjang, struk, tiket dapur, open bill); order_logs.productName varian = nama varian.
- Stok boleh minus: constraint inventory_stock_check di-DROP di Supabase; validasi stok kurang di backend dihapus; tombol varian tidak lagi disabled. `GET /api/products/stock` → badge merah "Stok Minus"/"Stok 0" di kartu produk (porsi < 1).
- Riwayat Shift: tombol "Print Ulang" per baris → ShiftPrintDialog (saldo awal, penjualan, kas masuk/keluar, saldo akhir, fisik, selisih) via window.print.
- variant_ingredients.inventory_id sudah text (diubah user) — checkout varian teruji memotong inventory via trigger.

## 2026-10-24 — HPP varian
- Transaksi baru: hpp item varian = Σ(variant_ingredients.qty_needed × inventory.cost_per_unit) (variant_hpp di variants.py); varian tanpa resep → HPP produk utama. Transaksi lama TIDAK dihitung ulang (pilihan user).


## 2026-10-26 — Bug: halaman login kosong (502)
- Penyebab: PIN Admin & KASIR PAGI diisi teks biasa langsung di Supabase → bcrypt "Invalid salt" saat startup → backend gagal start.
- Fix: verify_pin aman untuk nilai non-hash; startup meng-hash PIN teks biasa (nilai tetap); seed tidak lagi me-reset PIN Admin ke ADMIN_PIN.






