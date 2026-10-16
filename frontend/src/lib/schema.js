export const SCHEMA = [
  { key: "products", name: "Products", desc: "Master menu yang dijual", fields: [
    ["id", "string", "PK"], ["name", "string"], ["category", "string"], ["price", "number"], ["price_ojol", "number", "+"], ["type", "string"], ["image", "string"],
    ["inventoryId", "string", "FK", "inventory"], ["hpp", "number"],
  ] },
  { key: "recipes", name: "Recipes", desc: "Komposisi bahan per 1 porsi (tabel penghubung Products ⇄ Inventory)", fields: [
    ["productId", "string", "PK·FK", "products"], ["inventoryId", "string", "PK·FK", "inventory"], ["qty_needed", "number"],
  ] },
  { key: "inventory", name: "Inventory", desc: "Stok bahan baku, kemasan & barang jadi", fields: [
    ["id", "string", "PK"], ["name", "string"], ["type", "string"], ["stock", "number"], ["unit", "string"], ["cost_per_unit", "number"],
    ["min_stock", "number", "+"],
  ] },
  { key: "tables", name: "Tables", desc: "Meja, status okupansi & posisi denah", fields: [
    ["id", "string", "PK"], ["name", "string"], ["area", "string"], ["status", "available|occupied|paid|reserved"], ["orderData.openBillId", "object", "FK", "open_bills"],
    ["kind", "table|fixture", "+"], ["x, y", "int (grid)", "+"],
  ] },
  { key: "open_bills", name: "OpenBills", desc: "Pesanan tersimpan belum dibayar", fields: [
    ["id", "string", "PK"], ["timestamp", "string"], ["type", "string"], ["customerName", "string"], ["total", "number"],
    ["items_json[].productId", "array", "FK", "products"], ["userId", "string", "FK", "users"], ["waiterName", "string"],
    ["tableId", "string", "FK+", "tables"], ["customerId", "string", "FK+", "customers"],
  ] },
  { key: "transactions", name: "Transactions", desc: "Penjualan lunas (snapshot harga & HPP)", fields: [
    ["id", "string", "PK"], ["date", "string"], ["type", "Dine In|Takeaway|Walk In|Ojek Online"], ["method", "string"], ["tableId", "string", "FK", "tables"],
    ["customerId", "string", "FK+", "customers"], ["total", "number"], ["items_json[].productId", "array", "FK", "products"],
    ["userId", "string", "FK", "users"], ["cashGiven", "number"], ["waiterName", "string"], ["shiftId", "string", "FK+", "shifts"],
  ] },
  { key: "customers", name: "Customers", desc: "Pelanggan & loyalitas", fields: [
    ["id", "string", "PK"], ["name", "string"], ["wa", "string"], ["email", "string"], ["points", "number"], ["visits", "number"], ["total_spent", "number"],
  ] },
  { key: "purchases", name: "Purchases", desc: "Restock dari supplier", fields: [
    ["id", "string", "PK"], ["date", "string"], ["supplier", "string"], ["items_json[].inventoryId", "array", "FK", "inventory"],
    ["total_cost", "number"], ["userId", "string", "FK", "users"],
  ] },
  { key: "expenses", name: "Expenses", desc: "Beban operasional", fields: [
    ["id", "string", "PK"], ["date", "string"], ["category", "string"], ["description", "string"], ["amount", "number"], ["userId", "string", "FK", "users"],
  ] },
  { key: "users", name: "Users", desc: "Staf dengan login PIN", fields: [
    ["id", "string", "PK"], ["name", "string"], ["pin", "bcrypt hash"], ["role", "admin|kasir|waiter"],
  ] },
  { key: "shifts", name: "Shifts (tambahan)", desc: "Buka/tutup kasir, kas awal & selisih laci (blind close)", fields: [
    ["id", "string", "PK"], ["userId", "string", "FK", "users"], ["openedAt", "string"], ["openingCash", "number"], ["status", "open|closed"],
    ["cashSales", "number"], ["cashIn", "number"], ["cashOut", "number"], ["expectedCash", "number"], ["countedCash", "number"], ["difference", "number"],
  ] },
  { key: "cash_movements", name: "CashMovements (tambahan)", desc: "Kas masuk & kas keluar selama shift", fields: [
    ["id", "string", "PK"], ["shiftId", "string", "FK", "shifts"], ["userId", "string", "FK", "users"], ["type", "in|out"], ["amount", "number"], ["note", "string"], ["timestamp", "string"],
  ] },
  { key: "sales_targets", name: "SalesTargets (tambahan)", desc: "Target jumlah item per shift pelayan", fields: [
    ["id", "string", "PK"], ["name", "string"], ["productIds[]", "array", "FK", "products"], ["targetQty", "int"], ["waiterId", "string|null", "FK", "users"],
  ] },
  { key: "waiter_shifts", name: "WaiterShifts (tambahan)", desc: "Shift pelayan — periode hitung target", fields: [
    ["id", "string", "PK"], ["userId", "string", "FK", "users"], ["openedAt", "string"], ["closedAt", "string"], ["status", "open|closed"], ["results", "array"],
  ] },
  { key: "order_logs", name: "OrderLogs (tambahan)", desc: "Log qty item saat order (+/−) per pelayan", fields: [
    ["id", "uuid", "PK"], ["waiterId", "string", "FK", "users"], ["shiftId", "string", "FK", "waiter_shifts"], ["productId", "string", "FK", "products"],
    ["qty", "int (delta)"], ["source", "string"], ["refId", "string"], ["timestamp", "string"],
  ] },
  { key: "void_logs", name: "VoidLogs (tambahan)", desc: "Audit void open bill dengan otorisasi PIN admin", fields: [
    ["id", "string", "PK"], ["billId", "string"], ["tableId", "string", "FK", "tables"], ["total", "number"], ["items_json", "array"],
    ["reason", "string"], ["requestedBy", "string"], ["authorizedBy", "string"], ["timestamp", "string"],
  ] },
];

export const RELATIONS = [
  ["recipes.productId", "products.id", "N : 1", "Hapus produk → resepnya ikut terhapus"],
  ["recipes.inventoryId", "inventory.id", "N : 1", "Bahan tidak bisa dihapus selama dipakai resep"],
  ["products.inventoryId", "inventory.id", "N : 1", "Barang jadi tanpa resep: stok −1 per porsi"],
  ["tables.orderData.openBillId", "open_bills.id", "1 : 1", "Meja 'occupied' menunjuk ke open bill aktif"],
  ["open_bills.tableId", "tables.id", "1 : 1", "Membuat bill mengisi meja; bayar/batal mengosongkan"],
  ["open_bills.customerId", "customers.id", "N : 1", "Diteruskan ke transaksi saat dibayar"],
  ["open_bills.userId", "users.id", "N : 1", "Staf yang menginput pesanan"],
  ["open_bills.items_json[].productId", "products.id", "N : M", "Harga diambil dari master produk"],
  ["transactions.tableId", "tables.id", "N : 1", "Meja berstatus 'paid' (Lunas) saat lunas, lalu dikosongkan manual"],
  ["transactions.customerId", "customers.id", "N : 1", "+visits, +total_spent, +1 poin / Rp10.000"],
  ["transactions.userId", "users.id", "N : 1", "Kasir yang memproses pembayaran"],
  ["transactions.items_json[].productId", "products.id", "N : M", "Stok bahan dikurangi via Recipes saat lunas"],
  ["purchases.items_json[].inventoryId", "inventory.id", "N : M", "Stok bertambah, cost_per_unit diperbarui, HPP dihitung ulang"],
  ["purchases.userId", "users.id", "N : 1", "Admin yang mencatat"],
  ["expenses.userId", "users.id", "N : 1", "Admin yang mencatat"],
  ["void_logs.tableId", "tables.id", "N : 1", "Riwayat void per meja"],
  ["transactions.shiftId", "shifts.id", "N : 1", "Penjualan tunai dihitung ke kas laci shift"],
  ["shifts.userId", "users.id", "N : 1", "Kasir pemilik shift (1 shift terbuka per kasir)"],
  ["cash_movements.shiftId", "shifts.id", "N : 1", "Kas masuk/keluar menambah/mengurangi uang seharusnya"],
  ["sales_targets.productIds[]", "products.id", "N : M", "Satu target bisa berisi beberapa item (jumlah digabung)"],
  ["order_logs.shiftId", "waiter_shifts.id", "N : 1", "Progres = Σ qty item target dalam shift pelayan"],
  ["open_bills.waiterId", "users.id", "N : 1", "Pelayan yang mendapat kredit order"],
];
