import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { api, errMsg, num, rp } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TYPES = ["Bahan Baku", "Kemasan", "Barang Jadi", "Consumable"];
const FIELDS = [
  { name: "name", label: "Nama bahan", required: true },
  { name: "type", label: "Jenis", type: "select", options: TYPES.map((t) => ({ value: t, label: t })) },
  { name: "unit", label: "Satuan", required: true, placeholder: "gram / ml / pcs / kg" },
  { name: "stock", label: "Stok saat ini", type: "number" },
  { name: "min_stock", label: "Stok minimum (peringatan)", type: "number" },
  { name: "cost_per_unit", label: "Biaya per satuan (Rp)", type: "number", required: true },
];

const status = (i) => (i.stock <= 0 ? ["Habis", "text-destructive bg-destructive/15"] : i.stock <= i.min_stock ? ["Menipis", "text-rose-700 bg-rose-100 animate-pulse"] : ["Aman", "text-emerald-700 bg-emerald-100"]);

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(() => api.get("/inventory").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (f) => {
    const body = { name: f.name, type: f.type || "Bahan Baku", unit: f.unit, stock: Number(f.stock) || 0, min_stock: Number(f.min_stock) || 0, cost_per_unit: Number(f.cost_per_unit) || 0 };
    if (dialog.id) await api.put(`/inventory/${dialog.id}`, body);
    else await api.post("/inventory", body);
    toast.success("Bahan tersimpan");
    load();
  };

  const value = items.reduce((s, i) => s + i.stock * i.cost_per_unit, 0);
  const low = items.filter((i) => i.stock <= i.min_stock).length;

  return (
    <div>
      <PageHeader title="Stok Bahan" subtitle="Berkurang otomatis via resep saat transaksi, bertambah via pembelian.">
        <Button data-testid="add-inventory-button" onClick={() => setDialog({ type: "Bahan Baku", stock: 0, min_stock: 0 })}><Plus className="mr-1 h-4 w-4" />Tambah Bahan</Button>
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Jumlah bahan" value={items.length} testid="inventory-count" />
        <StatCard label="Nilai persediaan" value={rp(value)} testid="inventory-value" />
        <StatCard label="Perlu restock" value={low} tone={low ? "text-rose-600" : ""} testid="inventory-low-count" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Bahan</TableHead><TableHead>Jenis</TableHead><TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Biaya/satuan</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => {
              const [label, cls] = status(i);
              return (
                <TableRow key={i.id} data-testid={`inventory-row-${i.id}`}>
                  <TableCell><p className="font-medium">{i.name}</p><p className="font-mono text-xs text-muted-foreground">{i.id}</p></TableCell>
                  <TableCell className="text-muted-foreground">{i.type}</TableCell>
                  <TableCell data-testid={`inventory-stock-${i.id}`} className="text-right font-mono">{num(i.stock)} <span className="text-xs text-muted-foreground">{i.unit}</span></TableCell>
                  <TableCell className="text-right font-mono">{rp(i.cost_per_unit)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{rp(i.stock * i.cost_per_unit)}</TableCell>
                  <TableCell><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button data-testid={`inventory-edit-${i.id}`} onClick={() => setDialog(i)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <ConfirmDelete testid={`inventory-delete-${i.id}`} title={`Hapus ${i.name}?`} description="Bahan yang masih dipakai resep/produk tidak bisa dihapus."
                        onConfirm={async () => { await api.delete(`/inventory/${i.id}`); load(); }} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <FormDialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} title={dialog?.id ? "Edit Bahan" : "Tambah Bahan"} fields={FIELDS} initial={dialog} onSubmit={save} testid="inventory-form" />
    </div>
  );
}
