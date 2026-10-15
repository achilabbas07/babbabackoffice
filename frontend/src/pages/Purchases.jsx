import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api, errMsg, fmtDate, num, rp } from "@/lib/api";
import { PageHeader, Empty } from "@/components/PageHeader";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { Button } from "@/components/ui/button";

export default function Purchases() {
  const [list, setList] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([api.get("/purchases"), api.get("/inventory")]);
      setList(p.data);
      setInventory(i.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Pembelian" subtitle="Restock bahan dari supplier — stok inventory bertambah otomatis.">
        <Button data-testid="add-purchase-button" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Pembelian Baru</Button>
      </PageHeader>
      {list.length === 0 ? <Empty testid="purchases-empty" text="Belum ada pembelian." /> : (
        <div className="space-y-3">
          {list.map((p) => (
            <details key={p.id} data-testid={`purchase-row-${p.id}`} className="group rounded-2xl border border-border bg-card px-5 py-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.supplier}</p>
                  <p className="font-mono text-xs text-muted-foreground">{p.id} · {fmtDate(p.date)} · oleh {p.userName}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">{rp(p.total_cost)}</p>
                  <p className="text-xs text-muted-foreground">{p.items_json.length} bahan</p>
                </div>
              </summary>
              <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                {p.items_json.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-muted-foreground">
                    <span>{i.name} · {num(i.qty)} {i.unit} × {rp(i.cost_per_unit)}</span><span className="font-mono">{rp(i.subtotal)}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
      <PurchaseDialog open={open} onOpenChange={setOpen} inventory={inventory} onSaved={load} />
    </div>
  );
}
