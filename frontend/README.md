# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Cetak langsung via Bluetooth

Utilitas `src/lib/bluetoothThermalPrinter.js` mengirim struk kitchen/payment dalam perintah ESC/POS langsung ke printer, tanpa `window.print()`. Tombol contoh tersedia di `src/components/BluetoothReceiptButton.jsx`.

Web Bluetooth memerlukan browser yang mendukungnya (umumnya Chrome/Edge) dan halaman HTTPS atau localhost. Simpan order meminta izin/pilihan printer dari gesture pengguna bila belum dipilih; setelah save berhasil, tiket dapur otomatis mencetak hanya item baru yang belum `is_printed`. Dialog dapur juga memisahkan cetak item baru dari tombol **Cetak Ulang Item Tercetak**; penanda DUPLIKAT hanya dipakai untuk cetak ulang manual. Perangkat tersimpan di memori halaman agar cetak berikutnya tidak meminta pairing lagi; bila koneksi putus, modul mencoba menyambungkan ulang perangkat yang sama. Default layanan RPP02 adalah UUID `000018f0-0000-1000-8000-00805f9b34fb`, dengan karakteristik tulis `00002af1-0000-1000-8000-00805f9b34fb`; jika printer memakai UUID lain, berikan `serviceUuid` dan `characteristicUuid` ke komponen. Header waktu struk memakai waktu awal pesanan (`orderTime`/`createdAt`); bagian terbayar memakai waktu pembayaran (`paidAt`). Nomor urut dicetak dari `queueNumber`, metode pembayaran mengikuti transaksi, dan baris kembalian hanya dicetak untuk Cash/Tunai. Data `kitchen` menerima detail pesanan dan `items`/`items_json`; `payment` menerima detail transaksi, `items`/`items_json`, `total`, dan `profile` (`nama_usaha`, `alamat`, `kota`, `telepon`, `logo_url`). Logo dimuat melalui canvas; server logo lintas-origin harus mengizinkan CORS agar bisa dicetak, jika tidak struk tetap dicetak tanpa logo. `bill` mencetak open bill yang belum lunas melalui Bluetooth.

## Login Supabase Auth

Frontend ini memakai Create React App (`react-scripts` melalui CRACO), jadi nama variabel browser harus diawali `REACT_APP_` — bukan `NEXT_PUBLIC_`. File `.env` harus berada di folder `frontend`, sejajar dengan `package.json`. Salin template dari folder `frontend`:

```powershell
Copy-Item .env.example .env
```

Isi `frontend/.env` dengan URL project dan anon/publishable key dari Supabase Dashboard -> Project Settings -> API, serta alamat backend POS:

```dotenv
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

`REACT_APP_BACKEND_URL` adalah origin backend tanpa akhiran `/api` (contoh lokal di atas memakai port yang digunakan tes backend proyek ini). Pastikan backend benar-benar berjalan pada alamat tersebut. Jika backend berada di port/host lain, gunakan alamat yang sesuai. Simpan `.env` di `frontend/.env`, bukan di root repository. Setelah mengubahnya, hentikan dan jalankan ulang dev server (`npm start`); CRA hanya membaca environment ketika proses dimulai. URL Supabase yang kosong atau key placeholder akan ditampilkan sebagai kesalahan konfigurasi, dan frontend tidak lagi mengirim request ke URL `undefined/api`.

Contoh client yang dipakai proyek:

```js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);
```

Nilai anon/publishable key memang digunakan di browser; keamanan database harus ditegakkan dengan RLS. Jangan pernah gunakan `service_role` key di frontend.

Layar login meminta email/password Supabase terlebih dahulu. Error `400` pada `grant_type=password` biasanya berarti kredensial tidak cocok atau email belum dikonfirmasi; periksa isi respons Auth di Developer Tools, karena error itu sendiri tidak membuktikan bahwa URL/key bernilai `undefined`. Setelah autentikasi berhasil, sesi disimpan oleh SDK dan UI menampilkan akun POS yang role-nya cocok dengan claim `app_metadata.pos_role` (`owner` -> `admin`, `kasir` -> `kasir`, `pelayan` -> `waiter`). PIN POS tetap diminta sebagai langkah lanjutan melalui backend POS.

### Pemulihan password dan akun testing

**Memulai reset dari Dashboard:** buka Supabase Dashboard -> pilih project -> Authentication -> Users, cari user berdasarkan email, lalu gunakan tindakan **Send password recovery** (nama menu bisa sedikit berbeda). User harus membuka email pemulihan dan menetapkan password baru; dashboard tidak dapat menampilkan password lama. Untuk tautan localhost, tambahkan URL lokal aplikasi di Authentication -> URL Configuration -> Redirect URLs jika alur recovery memintanya. Pastikan SMTP/email provider project berfungsi.

**Membuat user testing tanpa verifikasi email:** di Authentication -> Users pilih **Add user** / **Create new user**, isi email dan password lokal, lalu aktifkan **Auto Confirm User** (atau opsi konfirmasi email yang setara) sebelum membuat user. Ini hanya melewati verifikasi email; user baru tetap perlu claim `app_metadata.pos_role` yang cocok agar bisa melewati login aplikasi. Untuk membuat akun dengan role sekaligus tanpa mengirim email, gunakan skrip admin tepercaya [`admin-scripts/provision_users.js`](../admin-scripts/provision_users.js), yang memanggil Admin API dengan `email_confirm: true`. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh berada di `.env` lokal skrip admin/server, jangan pernah di frontend atau repository.

Akun Auth juga harus memiliki user POS yang cocok pada backend (role `owner` -> `admin`, `kasir` -> `kasir`, `pelayan` -> `waiter`) dan PIN POS. Skrip provisioning Supabase hanya membuat akun Auth; skrip tersebut tidak membuat record pengguna POS. Untuk deployment, atur ketiga variabel `REACT_APP_...` pada environment hosting dan build ulang frontend.
