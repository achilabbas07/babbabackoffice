import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { LockOpen, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, rp } from "@/lib/api";

const ShiftCtx = createContext({ shift: null, refresh: () => {} });
export const useShift = () => useContext(ShiftCtx);

export const OpenShiftForm = ({ onOpened }) => {
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/shifts/open", { openingCash: Number(cash) || 0 });
      toast.success("Shift dibuka");
      onOpened();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} data-testid="open-shift-form" className="space-y-4">
      <label className="block text-sm font-medium">Kas awal di laci</label>
      <input
        data-testid="opening-cash-input"
        type="number"
        inputMode="numeric"
        autoFocus
        value={cash}
        onChange={(e) => setCash(e.target.value)}
        placeholder="0"
        className="h-14 w-full rounded-xl border border-border bg-white px-4 font-mono text-2xl outline-none focus:border-primary"
      />
      <div className="flex flex-wrap gap-2">
        {[0, 200000, 300000, 500000].map((v) => (
          <button type="button" key={v} data-testid={`opening-quick-${v}`} onClick={() => setCash(String(v))}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs hover:border-primary">{rp(v)}</button>
        ))}
      </div>
      <button data-testid="open-shift-submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">
        <LockOpen className="h-4 w-4" />{busy ? "Membuka..." : "Buka Shift"}
      </button>
    </form>
  );
};

const OpenShiftScreen = ({ onOpened }) => {
  const { user, logout } = useAuth();
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm fade-up">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Buka Shift</p>
        <h1 className="mt-2 text-2xl font-bold">Halo, {user.name}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Hitung uang di laci kasir, lalu masukkan sebagai kas awal sebelum mulai bertransaksi.</p>
        <OpenShiftForm onOpened={onOpened} />
        <button data-testid="open-shift-logout" onClick={logout} className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Bukan Anda? Keluar
        </button>
      </div>
    </div>
  );
};

export const ShiftGate = ({ children }) => {
  const { user } = useAuth();
  const tracked = user.role === "kasir" || user.role === "admin";
  const [state, setState] = useState({ loaded: !tracked, shift: null });

  const refresh = useCallback(() => {
    if (!tracked) return;
    api.get("/shifts/current").then((r) => setState({ loaded: true, shift: r.data.shift })).catch((e) => toast.error(errMsg(e)));
  }, [tracked]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!state.loaded) return <p className="py-20 text-center text-sm text-muted-foreground">Memuat shift...</p>;
  if (user.role === "kasir" && !state.shift) return <OpenShiftScreen onOpened={refresh} />;
  return <ShiftCtx.Provider value={{ shift: state.shift, refresh }}>{children}</ShiftCtx.Provider>;
};
