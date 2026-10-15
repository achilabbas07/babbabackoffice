import { Minus, Plus, X, Save, CreditCard, ShoppingBag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rp } from "@/lib/api";

const OrderOptions = ({ order, setOrder, tables, customers }) => {
  const freeTables = tables.filter((t) => t.status !== "occupied" || t.orderData?.openBillId === order.billId);
  const set = (patch) => setOrder((o) => ({ ...o, ...patch }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {["Dine In", "Takeaway"].map((t) => (
          <button
            key={t}
            data-testid={`order-type-${t.replace(" ", "-").toLowerCase()}`}
            onClick={() => set({ type: t, tableId: t === "Takeaway" ? "none" : order.tableId })}
            className={`h-9 rounded-lg text-sm font-medium transition-colors ${order.type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={order.tableId} onValueChange={(v) => set({ tableId: v })} disabled={order.type !== "Dine In"}>
          <SelectTrigger data-testid="order-table-select"><SelectValue placeholder="Meja" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Tanpa meja</SelectItem>
            {freeTables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.area}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={order.customerId}
          onValueChange={(v) => set({ customerId: v, customerName: v === "none" ? "" : customers.find((c) => c.id === v)?.name || "" })}
        >
          <SelectTrigger data-testid="order-customer-select"><SelectValue placeholder="Pelanggan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Pelanggan umum</SelectItem>
            {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          data-testid="order-customer-name-input"
          value={order.customerName}
          onChange={(e) => set({ customerName: e.target.value })}
          placeholder="Nama pemesan"
          className="h-10 rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
        />
        <input
          data-testid="order-waiter-input"
          value={order.waiterName}
          onChange={(e) => set({ waiterName: e.target.value })}
          placeholder="Nama waiter"
          className="h-10 rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
        />
      </div>
    </div>
  );
};

const CartLine = ({ item, onQty, onNotes, onRemove }) => (
  <div data-testid={`cart-item-${item.productId}`} className="rounded-xl border border-border p-3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{rp(item.price)}</p>
      </div>
      <button data-testid={`cart-remove-${item.productId}`} onClick={onRemove} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
    </div>
    <div className="mt-2 flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-border">
        <button data-testid={`cart-dec-${item.productId}`} onClick={() => onQty(-1)} className="grid h-8 w-8 place-items-center"><Minus className="h-3.5 w-3.5" /></button>
        <span data-testid={`cart-qty-${item.productId}`} className="w-7 text-center font-mono text-sm">{item.qty}</span>
        <button data-testid={`cart-inc-${item.productId}`} onClick={() => onQty(1)} className="grid h-8 w-8 place-items-center"><Plus className="h-3.5 w-3.5" /></button>
      </div>
      <input
        data-testid={`cart-notes-${item.productId}`}
        value={item.notes}
        onChange={(e) => onNotes(e.target.value)}
        placeholder="Catatan"
        className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-2 text-xs outline-none focus:border-primary"
      />
      <span className="font-mono text-sm font-semibold">{rp(item.price * item.qty)}</span>
    </div>
  </div>
);

export const CartPanel = ({ order, setOrder, tables, customers, cart, setCart, canPay, busy, onSaveBill, onPay, onReset }) => {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const qty = (id, d) => setCart((c) => c.map((i) => (i.productId === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0));
  const notes = (id, v) => setCart((c) => c.map((i) => (i.productId === id ? { ...i, notes: v } : i)));
  const remove = (id) => setCart((c) => c.filter((i) => i.productId !== id));

  return (
    <aside data-testid="cart-panel" className="flex flex-col rounded-2xl border border-border bg-card lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="font-semibold">Pesanan {order.billId && <span data-testid="cart-bill-id" className="font-mono text-primary">#{order.billId}</span>}</p>
          <p className="text-xs text-muted-foreground">{cart.length} menu</p>
        </div>
        {(cart.length > 0 || order.billId) && <button data-testid="cart-reset-button" onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground">Pesanan baru</button>}
      </div>
      <div className="border-b border-border px-5 py-4"><OrderOptions order={order} setOrder={setOrder} tables={tables} customers={customers} /></div>
      <div className="min-h-[140px] flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {cart.length === 0 ? (
          <div className="grid h-full place-items-center py-8 text-center text-sm text-muted-foreground">
            <div><ShoppingBag className="mx-auto mb-2 h-7 w-7" />Ketuk menu untuk menambahkan</div>
          </div>
        ) : (
          cart.map((i) => <CartLine key={i.productId} item={i} onQty={(d) => qty(i.productId, d)} onNotes={(v) => notes(i.productId, v)} onRemove={() => remove(i.productId)} />)
        )}
      </div>
      <div className="space-y-3 border-t border-border px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span data-testid="cart-total" className="font-mono text-2xl font-bold text-primary">{rp(total)}</span>
        </div>
        <div className={`grid gap-2 ${canPay ? "grid-cols-2" : "grid-cols-1"}`}>
          <button
            data-testid="save-open-bill-button"
            disabled={!cart.length || busy}
            onClick={onSaveBill}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border font-semibold transition-colors hover:border-primary disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> {order.billId ? "Update Bill" : "Open Bill"}
          </button>
          {canPay && (
            <button
              data-testid="pay-button"
              disabled={!cart.length || busy}
              onClick={onPay}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <CreditCard className="h-4 w-4" /> Bayar
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
