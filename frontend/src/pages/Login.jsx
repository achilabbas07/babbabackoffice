import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Delete, Coffee, Lock, ArrowLeft, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, ROLE_LABEL } from "@/lib/api";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];
const ROLE_TONE = { admin: "bg-blue-100 text-blue-700", kasir: "bg-emerald-100 text-emerald-700", waiter: "bg-amber-100 text-amber-700" };

const UserPicker = ({ users, onPick }) => (
  <div data-testid="login-user-list" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {users.map((u) => (
      <button
        key={u.id}
        data-testid={`login-user-${u.id}`}
        onClick={() => onPick(u)}
        className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-5 text-center shadow-sm transition-transform hover:-translate-y-0.5 hover:border-primary active:scale-95"
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-lg font-bold text-primary">{u.name.slice(0, 1).toUpperCase()}</span>
        <span className="line-clamp-1 text-sm font-semibold">{u.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ROLE_TONE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
      </button>
    ))}
  </div>
);

const PinPad = ({ selected, onBack, onSubmit }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const press = (k) => {
    setError("");
    if (k === "clear") setPin("");
    else if (k === "back") setPin((p) => p.slice(0, -1));
    else if (pin.length < 6) setPin((p) => p + k);
  };
  const submit = async (e) => {
    e?.preventDefault();
    if (pin.length < 4) return setError("PIN minimal 4 digit");
    setBusy(true);
    try {
      await onSubmit(pin);
    } catch (err) {
      setError(errMsg(err));
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} data-testid="pin-login-form">
      <button type="button" data-testid="login-back-button" onClick={onBack} className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
        <ArrowLeft className="h-4 w-4" /><UserRound className="h-4 w-4 text-primary" />
        <span data-testid="login-selected-user" className="font-semibold">{selected.name}</span>
        <span className="text-xs text-muted-foreground">· ganti</span>
      </button>
      <div className="mb-6 flex justify-center gap-3" data-testid="pin-dots">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border transition-all duration-200 ${i < pin.length ? "scale-110 border-primary bg-primary" : "border-border"}`} />
        ))}
      </div>
      <input data-testid="pin-input" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" type="password" autoFocus className="sr-only" aria-label="PIN" />
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button type="button" key={k} data-testid={`pin-key-${k}`} onClick={() => press(k)}
            className="grid h-16 place-items-center rounded-2xl border border-border bg-card font-mono text-2xl font-semibold shadow-sm transition-transform duration-150 hover:border-primary/60 active:scale-95">
            {k === "back" ? <Delete className="h-5 w-5" /> : k === "clear" ? <span className="font-sans text-sm text-muted-foreground">Hapus</span> : k}
          </button>
        ))}
      </div>
      {error && <p data-testid="pin-error" className="mt-4 text-center text-sm text-destructive">{error}</p>}
      <button data-testid="pin-submit-button" type="submit" disabled={busy}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60">
        <Lock className="h-4 w-4" /> {busy ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
};

export default function Login() {
  const { user, login } = useAuth();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/auth/users").then((r) => setUsers(r.data)).catch(() => setUsers([]));
  }, []);

  if (user) return <Navigate to="/pos" replace />;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/images/kopi-susu.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-md text-white fade-up">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Point of Sale</p>
          <h1 className="mt-3 text-5xl font-bold leading-tight tracking-tight">Dari bar ke dapur, semua tercatat rapi.</h1>
          <p className="mt-4 text-slate-200">Kasir, meja, resep, stok bahan, hingga laba rugi dalam satu sistem.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md fade-up">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Coffee className="h-5 w-5" /></span>
            <div>
              <p className="text-xl font-bold">Kedai POS</p>
              <p className="text-sm text-muted-foreground">{selected ? "Masukkan PIN Anda" : "Pilih nama pengguna"}</p>
            </div>
          </div>
          {selected ? <PinPad selected={selected} onBack={() => setSelected(null)} onSubmit={(pin) => login(selected.id, pin)} /> : <UserPicker users={users} onPick={setSelected} />}
        </div>
      </div>
    </div>
  );
}
