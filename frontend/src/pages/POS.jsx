import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PayDialog } from "@/components/pos/PayDialog";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { AdminPinDialog } from "@/components/tables/AdminPinDialog";

const emptyOrder = (user) => ({
  billId: null, type: "Dine In", tableId: "none", customerId: "none", customerName: "", waiterName: user.role === "waiter" ? user.name : "", waiterId: user.role === "waiter" ? user.id : null,
});

export default function POS() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [order, setOrder] = useState(() => emptyOrder(user));
  const [cart, setCart] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState({});
  const [authPin, setAuthPin] = useState(null);
  const [pending, setPending] = useState(null);

  const loadRefs = useCallback(async () => {
    try {
      const [p, t, c, w] = await Promise.all([api.get("/products"), api.get("/tables"), api.get("/customers"), api.get("/users/waiters")]);
      setProducts(p.data);
      setTables(t.data);
      setCustomers(c.data);
      setWaiters(w.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    const billId = params.get("bill");
    const tableId = params.get("table");
    if (billId) {
      api.get(`/open-bills/${billId}`).then(({ data }) => {
        setOrder({ billId: data.id, type: data.type, tableId: data.tableId || "none", customerId: data.customerId || "none", customerName: data.customerName, waiterName: data.waiterName, waiterId: data.waiterId || null });
        setCart(data.items_json.map((i) => ({ productId: i.productId, name: i.productName, price: i.price, qty: i.qty, notes: i.notes || "" })));
        setSaved(Object.fromEntries(data.items_json.map((i) => [i.productId, i.qty])));
        setAuthPin(null);
      }).catch((e) => toast.error(errMsg(e)));
    } else if (tableId) {
      setOrder((o) => ({ ...o, type: "Dine In", tableId }));
    }
  }, [params]);

  const add = (p) => setCart((c) => (c.some((i) => i.productId === p.id)
    ? c.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i))
    : [...c, { productId: p.id, name: p.name, price: p.price, qty: 1, notes: "" }]));

  const reset = () => {
    setOrder(emptyOrder(user));
    setCart([]);
    setSaved({});
    setAuthPin(null);
    setParams({});
  };

  const needsAuth = user.role !== "admin" && !!order.billId && !authPin;
  const isLocked = (i) => needsAuth && (saved[i.productId] || 0) > 0 && i.qty <= saved[i.productId];
  const guarded = (id, newQty, apply) => {
    if (needsAuth && newQty < (saved[id] || 0)) setPending(() => apply);
    else apply();
  };
  const changeQty = (id, d) => {
    const item = cart.find((i) => i.productId === id);
    guarded(id, item.qty + d, () => setCart((c) => c.map((i) => (i.productId === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0)));
  };
  const removeItem = (id) => guarded(id, 0, () => setCart((c) => c.filter((i) => i.productId !== id)));

  const payload = () => ({
    type: order.type,
    tableId: order.type === "Dine In" && order.tableId !== "none" ? order.tableId : null,
    customerId: order.customerId !== "none" ? order.customerId : null,
    customerName: order.customerName,
    waiterName: order.waiterName,
    waiterId: order.waiterId || null,
    adminPin: authPin,
    items: cart.map(({ productId, qty, notes }) => ({ productId, qty, notes })),
  });

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const saveBill = () => run(async () => {
    const { data } = order.billId ? await api.put(`/open-bills/${order.billId}`, payload()) : await api.post("/open-bills", payload());
    toast.success(`Open bill ${data.id} tersimpan`);
    reset();
    loadRefs();
  });

  const pay = (method, cashGiven) => run(async () => {
    const { data } = await api.post("/transactions", { ...payload(), method, cashGiven, openBillId: order.billId });
    setPayOpen(false);
    setReceipt(data);
    toast.success(`Transaksi ${data.id} berhasil`);
    reset();
    loadRefs();
  });

  const ojol = order.type === "Ojek Online";
  const priceOf = (item) => {
    const p = products.find((x) => x.id === item.productId);
    if (!p) return item.price;
    return ojol && p.price_ojol > 0 ? p.price_ojol : p.price;
  };
  const total = cart.reduce((s, i) => s + priceOf(i) * i.qty, 0);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
      <ProductGrid products={products} onAdd={add} ojol={ojol} />
      <CartPanel
        order={order} setOrder={setOrder} tables={tables} customers={customers} waiters={waiters} cart={cart} setCart={setCart} priceOf={priceOf} total={total}
        canPay={user.role !== "waiter"} busy={busy} onQty={changeQty} onRemove={removeItem} isLocked={isLocked} onSaveBill={saveBill} onPay={() => setPayOpen(true)} onReset={reset}
      />
      <PayDialog open={payOpen} onOpenChange={setPayOpen} total={total} onPay={pay} busy={busy} />
      <ReceiptDialog trx={receipt} onClose={() => setReceipt(null)} />
      <AdminPinDialog open={!!pending} onClose={() => setPending(null)} testid="reduce-pin" needPin title="Otorisasi Admin"
        description="Item ini sudah tersimpan di bill. Mengurangi atau menghapus item butuh PIN admin."
        onSubmit={async ({ pin }) => { await api.post("/auth/verify-admin", { pin }); setAuthPin(pin); pending(); setPending(null); }} />
    </div>
  );
}
