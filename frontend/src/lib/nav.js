import {
  ShoppingCart, LayoutGrid, ReceiptText, History, Users, UtensilsCrossed, Boxes, Truck, Wallet, BarChart3, UserCog, Database, Banknote, ClipboardList, Target, Store, BookOpen, Scale,
} from "lucide-react";

const ALL = ["admin", "kasir", "waiter"];
const STAFF = ["admin", "kasir"];
const ADMIN = ["admin"];

export const NAV = [
  { to: "/pos", label: "Kasir", icon: ShoppingCart, roles: ALL },
  { to: "/tables", label: "Meja", icon: LayoutGrid, roles: ALL },
  { to: "/open-bills", label: "Open Bill", icon: ReceiptText, roles: ALL },
  { to: "/targets", label: "Target Sales", icon: Target, roles: ["admin", "waiter"] },
  { to: "/cash", label: "Kas & Shift", icon: Banknote, roles: STAFF },
  { to: "/transactions", label: "Transaksi", icon: History, roles: ADMIN },
  { to: "/customers", label: "Pelanggan", icon: Users, roles: STAFF },
  { to: "/products", label: "Produk & Resep", icon: UtensilsCrossed, roles: ADMIN },
  { to: "/inventory", label: "Stok Bahan", icon: Boxes, roles: ADMIN },
  { to: "/purchases", label: "Pembelian", icon: Truck, roles: ADMIN },
  { to: "/expenses", label: "Pengeluaran", icon: Wallet, roles: ADMIN },
  { to: "/reports", label: "Laporan", icon: BarChart3, roles: ADMIN },
  { to: "/shifts", label: "Riwayat Shift", icon: ClipboardList, roles: ADMIN },
  { to: "/users", label: "Pengguna", icon: UserCog, roles: ADMIN },
  { to: "/profile", label: "Profil Usaha", icon: Store, roles: ADMIN },
  { to: "/schema", label: "Skema Database", icon: Database, roles: ADMIN },
];

export const FINANCE_NAV = [
  { to: "/admin/jurnal", label: "Input Jurnal Umum", icon: BookOpen, roles: ADMIN },
  { to: "/admin/laporan-kas", label: "Buku Kas & Bank", icon: Banknote, roles: ADMIN },
  { to: "/admin/arus-kas", label: "Laporan Arus Kas", icon: BarChart3, roles: ADMIN },
  { to: "/admin/neraca", label: "Neraca & Persediaan", icon: Scale, roles: ADMIN },
  { to: "/admin/laba-rugi", label: "Laporan Laba Rugi", icon: BarChart3, roles: ADMIN },
];
