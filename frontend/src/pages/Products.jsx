import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, ChefHat, UtensilsCrossed } from "lucide-react";
import { api, errMsg, rp, PRODUCT_TYPE_LABEL } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { RecipeDialog } from "@/components/RecipeDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [recipeFor, setRecipeFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, i, r] = await Promise.all([api.get("/products"), api.get("/inventory"), api.get("/recipes")]);
      setProducts(p.data);
      setInventory(i.data);
      setRecipes(r.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const recipeCount = (pid) => recipes.filter((r) => r.productId === pid).length;
  const invName = (id) => inventory.find((i) => i.id === id)?.name;

  const fields = useMemo(() => [
    { name: "name", label: "Nama produk", required: true },
    { name: "category", label: "Kategori", required: true, placeholder: "Minuman / Makanan / Snack" },
    { name: "price", label: "Harga jual (Rp)", type: "number", required: true },
    { name: "type", label: "Tipe penjualan", type: "select", options: Object.entries(PRODUCT_TYPE_LABEL).map(([value, label]) => ({ value, label })) },
    { name: "image", label: "URL gambar", placeholder: "https://..." },
    { name: "inventoryId", label: "Barang jadi (stok langsung)", type: "select", allowNone: true, options: inventory.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })), hint: "Opsional. Dipakai bila produk tidak punya resep — stok berkurang 1 per porsi." },
    { name: "hpp", label: "HPP manual (Rp)", type: "number", hint: "Diabaikan bila produk punya resep atau barang jadi — HPP dihitung otomatis." },
  ], [inventory]);

  const save = async (f) => {
    const body = { name: f.name, category: f.category, price: Number(f.price) || 0, type: f.type || "both", image: f.image || "", inventoryId: f.inventoryId || null, hpp: Number(f.hpp) || 0 };
    if (dialog.id) await api.put(`/products/${dialog.id}`, body);
    else await api.post("/products", body);
    toast.success("Produk tersimpan");
    load();
  };

  return (
    <div>
      <PageHeader title="Produk & Resep" subtitle="HPP dihitung otomatis dari resep (qty bahan × biaya per unit).">
        <Button data-testid="add-product-button" onClick={() => setDialog({ type: "both", hpp: 0 })}><Plus className="mr-1 h-4 w-4" />Tambah Produk</Button>
      </PageHeader>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Produk</TableHead><TableHead>Kategori</TableHead><TableHead>Sumber stok</TableHead><TableHead className="text-right">Harga</TableHead><TableHead className="text-right">HPP</TableHead><TableHead className="text-right">Margin</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const rc = recipeCount(p.id);
              const margin = p.price ? ((p.price - p.hpp) / p.price) * 100 : 0;
              return (
                <TableRow key={p.id} data-testid={`product-row-${p.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <UtensilsCrossed className="m-3 h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div><p className="font-medium">{p.name}</p><p className="font-mono text-xs text-muted-foreground">{p.id} · {PRODUCT_TYPE_LABEL[p.type]}</p></div>
                    </div>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{rc ? `Resep (${rc} bahan)` : p.inventoryId ? `Barang jadi: ${invName(p.inventoryId) || p.inventoryId}` : "Manual"}</TableCell>
                  <TableCell className="text-right font-mono">{rp(p.price)}</TableCell>
                  <TableCell data-testid={`product-hpp-${p.id}`} className="text-right font-mono text-muted-foreground">{rp(p.hpp)}</TableCell>
                  <TableCell className={`text-right font-mono ${margin >= 50 ? "text-emerald-400" : "text-amber-400"}`}>{margin.toFixed(0)}%</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button data-testid={`product-recipe-${p.id}`} onClick={() => setRecipeFor(p)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-primary hover:bg-primary/10"><ChefHat className="h-4 w-4" />Resep</button>
                      <button data-testid={`product-edit-${p.id}`} onClick={() => setDialog(p)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <ConfirmDelete testid={`product-delete-${p.id}`} title={`Hapus ${p.name}?`} description="Resep produk ini juga akan dihapus. Riwayat transaksi tetap tersimpan."
                        onConfirm={async () => { await api.delete(`/products/${p.id}`); load(); }} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <FormDialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} title={dialog?.id ? "Edit Produk" : "Tambah Produk"} fields={fields} initial={dialog} onSubmit={save} testid="product-form" />
      <RecipeDialog product={recipeFor} inventory={inventory} onClose={() => setRecipeFor(null)} onSaved={load} />
    </div>
  );
}
