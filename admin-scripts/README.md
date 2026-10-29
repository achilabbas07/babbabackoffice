# Provision akun staf Supabase

Skrip administratif ini membuat satu pengguna Supabase Auth dan menetapkan
`app_metadata.pos_role`. Jalankan hanya dari komputer administrator tepercaya.

## Persiapan

Jalankan perintah berikut di PowerShell dari root repository:

```powershell
Set-Location .\admin-scripts
npm init -y
npm install dotenv @supabase/supabase-js
Copy-Item .env.example .env
```

Edit `.env`: isi URL project Supabase, service-role key dari Supabase Dashboard,
dan password awal unik minimal 12 karakter. Jangan commit `.env`, membagikan
isinya, atau memasukkan service-role key ke frontend React.

## Membuat akun

```powershell
node .\provision_users.js kasir_utama@warkopbabba.com kasir
```

Role yang diizinkan adalah `owner`, `kasir`, dan `pelayan`. Skrip mengonfirmasi
email untuk akun yang diprovisi administrator dan mengatur
`app_metadata.pos_role`. Gunakan password kuat yang berbeda untuk setiap staf;
jangan gunakan PIN POS sebagai password Supabase. Akun Auth yang dibuat di sini
tidak digunakan untuk login POS; login POS memakai nama dan PIN pengguna pada
tabel `users`.
