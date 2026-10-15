import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { rp } from "@/lib/api";

export const SplitBillDialog = ({ bill, open, onClose, onConfirm }) => {
  const [qty, setQty] = useState({});

  useEffect(() => {
    if (open) {
      setQty({});
    }
  }, [open]);

  if (!bill) return null;
  const items = bill.items_json;
  const change = (i, d) => setQty((q) => ({ ...q, [i.productId]: Math.min(i.qty, Math.max(0, (q[i.productId] || 0) + d)) }));
  const selected = items.filter((i) => qty[i.productId] > 0).map((i) => ({ ...i, qty: qty[i.productId] }));
  const total = selected.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="split-bill-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pisah Bill · {bill.id}</DialogTitle>
          <DialogDescription>Pilih item yang dibayar terpisah. Sisa item tetap di bill meja ini.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.productId} data-testid={`split-item-${i.productId}`} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.productName}</p>
                <p className="font-mono text-xs text-muted-foreground">{rp(i.price)} · di bill: {i.qty}</p>
              </div>
              <div className="flex items-center rounded-lg border border-border">
                <button data-testid={`split-dec-${i.productId}`} onClick={() => change(i, -1)} className="grid h-8 w-8 place-items-center"><Minus className="h-3.5 w-3.5" /></button>
                <span data-testid={`split-qty-${i.productId}`} className="w-7 text-center font-mono text-sm">{qty[i.productId] || 0}</span>
                <button data-testid={`split-inc-${i.productId}`} onClick={() => change(i, 1)} className="grid h-8 w-8 place-items-center"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
          <span className="text-sm text-muted-foreground">Total dibayar terpisah</span>
          <span data-testid="split-total" className="font-mono text-lg font-semibold text-primary">{rp(total)}</span>
        </div>
        <DialogFooter>
          <Button data-testid="split-confirm-button" disabled={!selected.length} onClick={() => onConfirm(selected)}>Lanjut Bayar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
