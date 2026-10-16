import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api, errMsg } from "@/lib/api";

export const TargetDialog = ({ target, products, waiters, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: "", productIds: [], targetQty: "", waiterId: null });
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setForm({ name: target.name || "", productIds: target.productIds || [], targetQty: target.targetQty || "", waiterId: target.waiterId || null });
      setQ("");
    }
  }, [target]);

  const toggle = (id) => setForm((f) => ({ ...f, productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id] }));
  const shown = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, targetQty: Number(form.targetQty) || 0 };
      if (target.id) await api.put(`/targets/${target.id}`, body);
      else await api.post("/targets", body);
      toast.success("Target tersimpan");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="target-form-dialog" className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{target?.id ? "Edit Target" : "Tambah Target"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nama target (opsional)</Label>
            <Input data-testid="target-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="mis. Paket Kopi Signature" />
          </div>
          <div className="grid gap-1.5">
            <Label>Item / Produk <span className="text-xs font-normal text-muted-foreground">({form.productIds.length} dipilih · jumlah semua item digabung)</span></Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input data-testid="target-form-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk" className="pl-9" />
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {shown.map((p) => (
                <label key={p.id} data-testid={`target-form-product-${p.id}`} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary">
                  <Checkbox checked={form.productIds.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.category}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Target jumlah item / shift</Label>
              <Input data-testid="target-form-targetQty" type="number" value={form.targetQty} onChange={(e) => setForm({ ...form, targetQty: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Berlaku untuk</Label>
              <Select value={form.waiterId || "none"} onValueChange={(v) => setForm({ ...form, waiterId: v === "none" ? null : v })}>
                <SelectTrigger data-testid="target-form-waiterId"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Semua pelayan</SelectItem>
                  {waiters.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button data-testid="target-form-submit" onClick={save} disabled={saving || !form.productIds.length || !Number(form.targetQty)}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
