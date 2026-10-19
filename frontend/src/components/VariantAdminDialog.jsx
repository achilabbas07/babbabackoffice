import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api, errMsg } from "@/lib/api";

const EMPTY = { product_id: "", variant_name: "", additional_price: 0 };
const INPUT = "h-10 w-full rounded-md border border-border bg-transparent px-3 text-sm outline-none focus:border-primary";

const IngredientRow = ({ idx, line, materials, onChange, onRemove }) => (
  <div data-testid={`variant-ingredient-row-${idx}`} className="grid grid-cols-[1fr_100px_32px] items-center gap-2">
    <Select value={line.inventory_id || undefined} onValueChange={(v) => onChange({ inventory_id: v })}>
      <SelectTrigger data-testid={`variant-material-select-${idx}`}><SelectValue placeholder="Pilih bahan baku" /></SelectTrigger>
      <SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · stok {Number(m.stock)} {m.unit}</SelectItem>)}</SelectContent>
    </Select>
    <input data-testid={`variant-qty-input-${idx}`} type="number" min="1" value={line.qty_needed} onChange={(e) => onChange({ qty_needed: e.target.value })} className={`${INPUT} font-mono`} placeholder="Qty" />
    <button data-testid={`variant-remove-ingredient-${idx}`} onClick={onRemove} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
  </div>
);

export const VariantAdminDialog = ({ open, products, onClose }) => {
  const [form, setForm] = useState(EMPTY);
  const [lines, setLines] = useState([{ inventory_id: "", qty_needed: 1 }]);
  const [materials, setMaterials] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setLines([{ inventory_id: "", qty_needed: 1 }]);
      api.get("/inventory").then((r) => setMaterials(r.data.filter((i) => i.type === "Bahan Baku"))).catch((e) => toast.error(errMsg(e)));
    }
  }, [open]);

  const update = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const save = async () => {
    const ingredients = lines.filter((l) => l.inventory_id).map((l) => ({ inventory_id: l.inventory_id, qty_needed: Number(l.qty_needed) }));
    if (!form.product_id || !form.variant_name.trim()) return toast.error("Pilih menu dan isi nama varian");
    if (!ingredients.length || ingredients.some((i) => !(i.qty_needed > 0))) return toast.error("Isi minimal 1 bahan baku dengan qty lebih dari 0");
    setSaving(true);
    try {
      await api.post("/menu-variants", { ...form, variant_name: form.variant_name.trim(), additional_price: Number(form.additional_price) || 0, ingredients });
      toast.success(`Varian ${form.variant_name} tersimpan dengan ${ingredients.length} bahan baku`);
      onClose();
    } catch (e) {
      toast.error(`Gagal menyimpan varian: ${errMsg(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="variant-admin-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Admin - Tambah Varian</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1 text-sm font-medium">Pilih Menu
            <Select value={form.product_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, product_id: v }))}>
              <SelectTrigger data-testid="variant-product-select"><SelectValue placeholder="Pilih menu utama" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm font-medium">Nama Varian
              <input data-testid="variant-name-input" value={form.variant_name} onChange={(e) => setForm((f) => ({ ...f, variant_name: e.target.value }))} className={INPUT} placeholder="Large / Less Sugar" />
            </label>
            <label className="block space-y-1 text-sm font-medium">Harga Tambahan (Rp)
              <input data-testid="variant-price-input" type="number" min="0" value={form.additional_price} onChange={(e) => setForm((f) => ({ ...f, additional_price: e.target.value }))} className={`${INPUT} font-mono`} />
            </label>
          </div>
          <div className="space-y-2 rounded-2xl bg-secondary p-4">
            <p className="text-sm font-semibold">Bahan Baku per porsi</p>
            {lines.map((l, idx) => (
              <IngredientRow key={idx} idx={idx} line={l} materials={materials} onChange={(p) => update(idx, p)} onRemove={() => setLines((ls) => ls.filter((_, i) => i !== idx))} />
            ))}
            <button data-testid="variant-add-ingredient" onClick={() => setLines((ls) => [...ls, { inventory_id: "", qty_needed: 1 }])} className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Plus className="h-4 w-4" /> Tambah Bahan
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button data-testid="variant-save-button" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Varian"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
