import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, itemKey, itemName } from "@/lib/api";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PayDialog } from "@/components/pos/PayDialog";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { AdminPinDialog } from "@/components/tables/AdminPinDialog";
import { VariantDialog } from "@/components/pos/VariantDialog";

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
  const [variants, setVariants] = useState([]);
  const [variantFor, setVariantFor] = useState(null);

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
        setCart(data.items_json.map((i) => ({ key: itemKey(i), productId: i.productId, variantId: i.variantId ?? null, extra: i.variantPrice || 0, name: itemName(i), price: i.price, qty: i.qty, notes: i.notes || "" })));
        setSaved(Object.fromEntries(data.items_json.map((i) => [itemKey(i), i.qty])));
        setAuthPin(null);
      }).catch((e) => toast.error(errMsg(e)));
    } else if (tableId) {
      setOrder((o) => ({ ...o, type: "Dine In", tableId }));
    }
  }, [params]);

  const addLine = (p, v) => {
    const key = `${p.id}:${v ? v.id : ""}`;
    const inCart = cart.find((i) => i.key === key)?.qty || 0;
    if (v && v.available != null && inCart + 1 > v.available) {
      toast.error(`Stok bahan baku untuk ${p.name} ${v.variant_name} tidak cukup${v.available > 0 ? `, maksimal ${v.available}` : " / habis"}`);
      return;
    }
    setCart((c) => (c.some((i) => i.key === key)
      ? c.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i))
      : [...c, { key, productId: p.id, variantId: v ? v.id : null, extra: v ? Number(v.additional_price || 0) : 0, name: v ? `${p.name} ${v.variant_name}` : p.name, price: p.price, qty: 1, notes: "" }]));
  };
  const variantsOf = (p) => variants.filter((v) => v.pid === p.id);
  const add = async (p) => {
    try {
      const { data } = await api.get("/menu-variants", { params: { product_id: p.id } });
      setVariants((vs) => [...vs.filter((v) => v.pid !== p.id), ...data.map((v) => ({ ...v, pid: p.id }))]);
      if (data.length) setVariantFor(p);
      else addLine(p, null);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const reset = () => {
    setOrder(emptyOrder(user));
    setCart([]);
    setSaved({});
    setAuthPin(null);
    setParams({});
  };

  const needsAuth = user.role !== "admin" && !!order.billId && !authPin;
  const isLocked = (i) => needsAuth && (saved[i.key] || 0) > 0 && i.qty <= saved[i.key];
  const guarded = (id, newQty, apply) => {
    if (needsAuth && newQty < (saved[id] || 0)) setPending(() => apply);
    else apply();
  };
  const changeQty = (id, d) => {
    const item = cart.find((i) => i.key === id);
    const v = item.variantId != null && variants.find((x) => x.id === item.variantId);
    if (d > 0 && v && v.available != null && item.qty + d > v.available) {
      toast.error(`Stok bahan baku untuk ${item.name} tidak cukup, maksimal ${v.available}`);
      return;
    }
    guarded(id, item.qty + d, () => setCart((c) => c.map((i) => (i.key === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0)));
  };
  const removeItem = (id) => guarded(id, 0, () => setCart((c) => c.filter((i) => i.key !== id)));

  const payload = () => ({
    type: order.type,
    tableId: order.type === "Dine In" && order.tableId !== "none" ? order.tableId : null,
    customerId: order.customerId !== "none" ? order.customerId : null,
    customerName: order.customerName,
    waiterName: order.waiterName,
    waiterId: order.waiterId || null,
    adminPin: authPin,
    items: cart.map(({ productId, qty, notes, variantId }) => ({ productId, qty, notes, variantId })),
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

  const pay = (method, cashGiven, extra = {}) => run(async () => {
    const { data } = await api.post("/transactions", { ...payload(), method, cashGiven, openBillId: order.billId, ...extra });
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
    return (ojol && p.price_ojol > 0 ? p.price_ojol : p.price) + (item.extra || 0);
  };
  const total = cart.reduce((s, i) => s + priceOf(i) * i.qty, 0);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <ProductGrid products={products} onAdd={add} ojol={ojol} />
      <VariantDialog product={variantFor} variants={variantFor ? variantsOf(variantFor) : []} onClose={() => setVariantFor(null)}
        basePrice={variantFor ? (ojol && variantFor.price_ojol > 0 ? variantFor.price_ojol : variantFor.price) : 0}
        onPick={(v) => { addLine(variantFor, v); setVariantFor(null); }} />
      <CartPanel
        order={order} setOrder={setOrder} tables={tables} customers={customers} waiters={waiters} cart={cart} setCart={setCart} priceOf={priceOf} total={total}
        canPay={user.role !== "waiter"} busy={busy} onQty={changeQty} onRemove={removeItem} isLocked={isLocked} onSaveBill={saveBill} onPay={() => setPayOpen(true)} onReset={reset}
      />
      <PayDialog open={payOpen} onOpenChange={setPayOpen} total={total} onPay={pay} busy={busy} customerId={order.customerId !== "none" ? order.customerId : null} />
      <ReceiptDialog trx={receipt} onClose={() => setReceipt(null)} />
      <AdminPinDialog open={!!pending} onClose={() => setPending(null)} testid="reduce-pin" needPin title="Otorisasi Admin"
        description="Item ini sudah tersimpan di bill. Mengurangi atau menghapus item butuh PIN admin."
        onSubmit={async ({ pin }) => { await api.post("/auth/verify-admin", { pin }); setAuthPin(pin); pending(); setPending(null); }} />
    </div>
  );
}
