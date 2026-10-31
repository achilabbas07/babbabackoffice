import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errMsg, rp, todayStr, dateToIso } from "@/lib/api";

export const PurchaseDialog = ({ open, onOpenChange, inventory, onSaved }) => {
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(todayStr());
  const [fundingAccount, setFundingAccount] = useState("1-10001");
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSupplier("");
      setDate(todayStr());
      setFundingAccount("1-10001");
      setLines([{ inventoryId: "", qty: 1, cost_per_unit: 0 }]);
    }
  }, [open]);

  const update = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.cost_per_unit) || 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/purchases", {
        supplier, date: dateToIso(date),
        sumber_dana_akun: fundingAccount,
        items: lines.filter((l) => l.inventoryId).map((l) => ({ inventoryId: l.inventoryId, qty: Number(l.qty), cost_per_unit: Number(l.cost_per_unit) })),
      });
      toast.success("Pembelian tercatat, stok bertambah");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="purchase-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Pembelian Bahan</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label>Supplier</Label><Input data-testid="purchase-supplier-input" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nama supplier" /></div>
          <div className="grid gap-1.5"><Label>Tanggal</Label><Input data-testid="purchase-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1.5">
            <Label htmlFor="purchase-funding-account">Sumber Dana</Label>
            <Select value={fundingAccount} onValueChange={setFundingAccount}>
              <SelectTrigger id="purchase-funding-account" data-testid="purchase-funding-account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10001">Kas Tunai</SelectItem>
                <SelectItem value="1-10002">Kas Bank / QRIS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_90px_120px_32px] gap-2 text-xs text-muted-foreground"><span>Bahan</span><span>Qty</span><span>Harga/satuan</span><span /></div>
          {lines.map((l, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_90px_120px_32px] items-center gap-2">
              <Select value={l.inventoryId || undefined} onValueChange={(v) => update(idx, { inventoryId: v, cost_per_unit: inventory.find((i) => i.id === v)?.cost_per_unit || 0 })}>
                <SelectTrigger data-testid={`purchase-inventory-${idx}`}><SelectValue placeholder="Pilih bahan" /></SelectTrigger>
                <SelectContent>{inventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}</SelectContent>
              </Select>
              <Input data-testid={`purchase-qty-${idx}`} type="number" step="any" value={l.qty} onChange={(e) => update(idx, { qty: e.target.value })} className="font-mono" />
              <Input data-testid={`purchase-cost-${idx}`} type="number" step="any" value={l.cost_per_unit} onChange={(e) => update(idx, { cost_per_unit: e.target.value })} className="font-mono" />
              <button data-testid={`purchase-remove-${idx}`} onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
          <button data-testid="purchase-add-line" onClick={() => setLines((ls) => [...ls, { inventoryId: "", qty: 1, cost_per_unit: 0 }])} className="flex items-center gap-1.5 text-sm text-primary"><Plus className="h-4 w-4" />Tambah baris</button>
        </div>
        <p className="text-xs text-muted-foreground">Biaya per satuan bahan diperbarui ke harga beli terakhir, HPP produk terkait dihitung ulang.</p>
        <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
          <span className="text-sm text-muted-foreground">Total pembelian</span>
          <span data-testid="purchase-total" className="font-mono text-lg font-semibold text-primary">{rp(total)}</span>
        </div>
        <DialogFooter><Button data-testid="purchase-save-button" onClick={save} disabled={saving || !supplier}>{saving ? "Menyimpan..." : "Simpan Pembelian"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
