import { useEffect, useState } from "react";
import { Banknote, QrCode, CreditCard, Landmark } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { rp } from "@/lib/api";

const METHODS = [
  { id: "Cash", icon: Banknote },
  { id: "QRIS", icon: QrCode },
  { id: "Card", icon: CreditCard },
  { id: "Debit", icon: Landmark },
];

export const PayDialog = ({ open, onOpenChange, total, onPay, busy }) => {
  const [method, setMethod] = useState("Cash");
  const [cash, setCash] = useState("");

  useEffect(() => {
    if (open) {
      setMethod("Cash");
      setCash("");
    }
  }, [open]);

  const cashNum = Number(cash) || 0;
  const valid = method !== "Cash" || cashNum >= total;
  const quick = [...new Set([total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="pay-dialog" className="sm:max-w-md">
        <DialogHeader><DialogTitle>Pembayaran</DialogTitle></DialogHeader>
        <div className="rounded-xl bg-secondary p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total tagihan</p>
          <p data-testid="pay-total" className="mt-1 font-mono text-3xl font-bold text-primary">{rp(total)}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {METHODS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              data-testid={`pay-method-${id.toLowerCase()}`}
              onClick={() => setMethod(id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors ${method === id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
            >
              <Icon className="h-5 w-5" />{id}
            </button>
          ))}
        </div>
        {method === "Cash" && (
          <div className="space-y-3">
            <input
              data-testid="pay-cash-input"
              type="number"
              inputMode="numeric"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="Uang diterima"
              className="h-12 w-full rounded-xl border border-border bg-transparent px-4 font-mono text-lg outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-2">
              {quick.map((q, i) => (
                <button key={q} data-testid={`pay-quick-${i}`} onClick={() => setCash(String(q))} className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs hover:border-primary">
                  {i === 0 ? "Uang pas" : rp(q)}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kembalian</span>
              <span data-testid="pay-change" className={`font-mono font-semibold ${cashNum >= total ? "text-emerald-600" : "text-destructive"}`}>
                {cashNum >= total ? rp(cashNum - total) : "Uang kurang"}
              </span>
            </div>
          </div>
        )}
        <button
          data-testid="pay-confirm-button"
          disabled={!valid || busy}
          onClick={() => onPay(method, method === "Cash" ? cashNum : total)}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          {busy ? "Memproses..." : "Selesaikan Pembayaran"}
        </button>
      </DialogContent>
    </Dialog>
  );
};
