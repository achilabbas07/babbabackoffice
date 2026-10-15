import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Clock, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, fmtTime, rp } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";

const STATUS = {
  available: { label: "Tersedia", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  occupied: { label: "Terisi", cls: "border-amber-500/40 bg-amber-500/10 text-amber-400" },
  reserved: { label: "Reservasi", cls: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" },
};
const FIELDS = [
  { name: "name", label: "Nama meja", required: true },
  { name: "area", label: "Area", required: true, placeholder: "Indoor / Outdoor / VIP Room" },
];

const TableCard = ({ t, isAdmin, onOpen, onToggle, onEdit, onDelete }) => {
  const s = STATUS[t.status] || STATUS.available;
  const od = t.orderData;
  return (
    <div data-testid={`table-card-${t.id}`} className={`flex flex-col rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${s.cls}`}>
      <button data-testid={`table-open-${t.id}`} onClick={onOpen} className="flex-1 text-left">
        <div className="flex items-start justify-between">
          <p className="text-lg font-bold text-foreground">{t.name}</p>
          <span data-testid={`table-status-${t.id}`} className="rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
        </div>
        {od ? (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p className="font-mono text-base font-semibold text-foreground">{rp(od.total)}</p>
            <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(od.startTime)} · {od.itemCount} item</p>
            {(od.customerName || od.waiterName) && <p className="flex items-center gap-1"><User className="h-3 w-3" />{od.customerName || "-"} · {od.waiterName || "-"}</p>}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Ketuk untuk buat pesanan</p>
        )}
      </button>
      <div className="mt-3 flex items-center gap-1 border-t border-current/20 pt-2">
        {t.status !== "occupied" && (
          <button data-testid={`table-toggle-reserve-${t.id}`} onClick={onToggle} className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
            {t.status === "reserved" ? "Batal reservasi" : "Reservasi"}
          </button>
        )}
        {isAdmin && (
          <div className="ml-auto flex items-center">
            <button data-testid={`table-edit-${t.id}`} onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
            {t.status !== "occupied" && <ConfirmDelete testid={`table-delete-${t.id}`} title={`Hapus ${t.name}?`} onConfirm={onDelete} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Tables() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tables, setTables] = useState([]);
  const [dialog, setDialog] = useState(null);
  const isAdmin = user.role === "admin";

  const load = useCallback(() => api.get("/tables").then((r) => setTables(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => {
    load();
  }, [load]);

  const areas = [...new Set(tables.map((t) => t.area))];
  const counts = Object.keys(STATUS).map((k) => [k, tables.filter((t) => t.status === k).length]);

  const open = (t) => nav(t.status === "occupied" ? `/pos?bill=${t.orderData.openBillId}` : `/pos?table=${t.id}`);
  const toggle = async (t) => {
    try {
      await api.put(`/tables/${t.id}/status`, { status: t.status === "reserved" ? "available" : "reserved" });
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const save = async (form) => {
    const body = { name: form.name, area: form.area };
    if (dialog.id) await api.put(`/tables/${dialog.id}`, body);
    else await api.post("/tables", body);
    toast.success("Meja tersimpan");
    load();
  };

  return (
    <div>
      <PageHeader title="Denah Meja" subtitle="Status meja real-time. Meja terisi terhubung ke open bill aktif.">
        {counts.map(([k, n]) => <span key={k} data-testid={`table-count-${k}`} className={`rounded-full border px-3 py-1 text-xs ${STATUS[k].cls}`}>{STATUS[k].label}: {n}</span>)}
        {isAdmin && <Button data-testid="add-table-button" onClick={() => setDialog({})}><Plus className="mr-1 h-4 w-4" />Tambah Meja</Button>}
      </PageHeader>
      {areas.map((a) => (
        <section key={a} className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">{a}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tables.filter((t) => t.area === a).map((t) => (
              <TableCard key={t.id} t={t} isAdmin={isAdmin} onOpen={() => open(t)} onToggle={() => toggle(t)} onEdit={() => setDialog(t)}
                onDelete={async () => { await api.delete(`/tables/${t.id}`); load(); }} />
            ))}
          </div>
        </section>
      ))}
      <FormDialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} title={dialog?.id ? "Edit Meja" : "Tambah Meja"} fields={FIELDS} initial={dialog} onSubmit={save} testid="table-form" />
    </div>
  );
}
