import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Lock } from "lucide-react";
import { api, errMsg, fmtDate, fmtTime, rp } from "@/lib/api";
import { useShift, OpenShiftForm } from "@/components/ShiftGate";
import { PageHeader, StatCard, Empty } from "@/components/PageHeader";
import { FormDialog } from "@/components/FormDialog";
import { CloseShiftDialog } from "@/components/CloseShiftDialog";
import { Button } from "@/components/ui/button";

const FIELDS = [
  { name: "amount", label: "Jumlah (Rp)", type: "number", required: true },
  { name: "note", label: "Keterangan", required: true, placeholder: "mis. tambah uang kembalian / beli es batu" },
];

export default function Cash() {
  const { shift, refresh } = useShift();
  const [moves, setMoves] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [closing, setClosing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [connectingPrinter, setConnectingPrinter] = useState("");

  const connectPrinter = async (field, label) => {
    if (!navigator.bluetooth?.requestDevice) {
      toast.error("Browser ini tidak mendukung Web Bluetooth. Gunakan browser yang kompatibel melalui HTTPS.");
      return;
    }

    setConnectingPrinter(field);
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      if (!device.name) throw new Error("Nama perangkat Bluetooth tidak tersedia.");
      await api.put("/app-profile/printers", { [field]: device.name });
      toast.success(`${label} tersimpan: ${device.name}`);
    } catch (err) {
      toast.error(err.name === "NotFoundError" ? "Pemilihan perangkat dibatalkan." : errMsg(err));
    } finally {
      setConnectingPrinter("");
    }
  };

  useEffect(() => {
    if (dialog === "out") {
      api.get("/expense-categories").then((r) => setCategories(r.data)).catch((e) => toast.error(errMsg(e)));
    }
  }, [dialog]);

  const load = useCallback(() => {
    if (shift) api.get("/shifts/current/movements").then((r) => setMoves(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [shift]);
  useEffect(() => {
    load();
  }, [load]);

  if (!shift) {
    return (
      <div>
        <PageHeader title="Kas & Shift" subtitle="Belum ada shift terbuka untuk akun ini." />
        <div className="max-w-md rounded-2xl border border-border bg-card p-6"><OpenShiftForm onOpened={refresh} /></div>
      </div>
    );
  }

  const cin = moves.filter((m) => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const cout = moves.filter((m) => m.type === "out").reduce((s, m) => s + m.amount, 0);
  const outFields = [{ name: "expense_category_id", label: "Kategori Pengeluaran", type: "select", placeholder: "Pilih kategori", options: categories.map((c) => ({ value: c.id, label: c.name })) }, ...FIELDS];
  const save = async (f) => {
    if (dialog === "out" && !f.expense_category_id) throw new Error("Kategori pengeluaran wajib dipilih");
    const body = { type: dialog, amount: Number(f.amount) || 0, note: f.note || "" };
    if (dialog === "out") body.expense_category_id = Number(f.expense_category_id);
    await api.post("/shifts/cash-movements", body);
    toast.success(dialog === "in" ? "Kas masuk tercatat" : "Kas keluar tercatat");
    load();
  };

  return (
    <div>
      <PageHeader title="Kas & Shift" subtitle={`Shift ${shift.id} · dibuka ${fmtDate(shift.openedAt)} oleh ${shift.userName}`}>
        <Button data-testid="cash-in-button" variant="outline" onClick={() => setDialog("in")}><ArrowDownCircle className="mr-1 h-4 w-4 text-emerald-600" />Kas Masuk</Button>
        <Button data-testid="cash-out-button" variant="outline" onClick={() => setDialog("out")}><ArrowUpCircle className="mr-1 h-4 w-4 text-destructive" />Kas Keluar</Button>
        <Button data-testid="connect-cash-printer-button" variant="outline" size="sm" disabled={!!connectingPrinter} onClick={() => connectPrinter("printerKasir", "Printer Kasir")}>
          {connectingPrinter === "printerKasir" ? "Menghubungkan..." : "🔗 Printer Kasir"}
        </Button>
        <Button data-testid="connect-kitchen-printer-button" variant="outline" size="sm" disabled={!!connectingPrinter} onClick={() => connectPrinter("printerDapur", "Printer Dapur")}>
          {connectingPrinter === "printerDapur" ? "Menghubungkan..." : "🔗 Printer Dapur"}
        </Button>
        <Button data-testid="close-shift-button" onClick={() => setClosing(true)}><Lock className="mr-1 h-4 w-4" />Tutup Kasir</Button>
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Kas awal" value={rp(shift.openingCash)} testid="shift-opening-cash" />
        <StatCard label="Kas masuk" value={rp(cin)} tone="text-emerald-600" testid="shift-cash-in" />
        <StatCard label="Kas keluar" value={rp(cout)} tone="text-destructive" testid="shift-cash-out" />
      </div>
      {moves.length === 0 ? <Empty testid="cash-moves-empty" text="Belum ada kas masuk / keluar di shift ini." /> : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {moves.map((m) => (
            <div key={m.id} data-testid={`cash-move-${m.id}`} className="flex items-center gap-4 px-5 py-3">
              {m.type === "in" ? <ArrowDownCircle className="h-5 w-5 text-emerald-600" /> : <ArrowUpCircle className="h-5 w-5 text-destructive" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{m.note}</p>
                <p className="font-mono text-xs text-muted-foreground">{m.id} · {fmtTime(m.timestamp)} · {m.userName}</p>
              </div>
              <span className={`font-mono font-semibold ${m.type === "in" ? "text-emerald-600" : "text-destructive"}`}>{m.type === "in" ? "+" : "−"} {rp(m.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <FormDialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} title={dialog === "in" ? "Kas Masuk" : "Kas Keluar"} fields={dialog === "out" ? outFields : FIELDS} initial={dialog ? {} : null} onSubmit={save} testid="cash-form" />
      <CloseShiftDialog open={closing} onOpenChange={setClosing} onClosed={refresh} />
    </div>
  );
}
