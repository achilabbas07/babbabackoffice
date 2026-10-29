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

## Login POS nama dan PIN

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

`REACT_APP_BACKEND_URL` adalah origin backend tanpa akhiran `/api` (contoh lokal di atas memakai port yang digunakan tes backend proyek ini). Pastikan backend benar-benar berjalan pada alamat tersebut. Jika backend berada di port/host lain, gunakan alamat yang sesuai. Simpan `.env` di `frontend/.env`, bukan di root repository. Setelah mengubahnya, hentikan dan jalankan ulang dev server (`npm start`); CRA hanya membaca environment ketika proses dimulai.

Login POS menampilkan grid pengguna dari `GET /api/auth/users`. Setelah pengguna dipilih, frontend mengirim ID pengguna dan PIN 4-6 digit ke `POST /api/auth/login`. Backend memverifikasi PIN terhadap hash bcrypt dan mengembalikan token serta data pengguna. Token disimpan di `localStorage` dan dikirim untuk otorisasi request POS; pemeriksaan akses tetap dilakukan backend. `POST /api/login` juga tersedia untuk klien yang mengirim nama dan PIN.

Variabel Supabase di atas masih digunakan fitur POS lain yang memanggil RPC Supabase, tetapi tidak diperlukan untuk login. Nilai anon/publishable key memang digunakan di browser; keamanan database harus ditegakkan dengan RLS. Jangan pernah gunakan `service_role` key di frontend.

Contoh client yang dipakai proyek:

```js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);
```

Nama, peran, dan PIN pengguna POS dikelola melalui menu **Pengguna & PIN** oleh admin. Password Supabase Auth dan akun yang dibuat lewat [`admin-scripts/provision_users.js`](../admin-scripts/provision_users.js) tidak digunakan untuk login POS.
