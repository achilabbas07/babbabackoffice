import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Delete, Coffee, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export default function Login() {
  const { user, login } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/pos" replace />;

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
      await login(pin);
    } catch (err) {
      setError(errMsg(err));
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/images/kopi-susu.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-md fade-up">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Point of Sale</p>
          <h1 className="mt-3 text-5xl font-bold leading-tight tracking-tight">Dari bar ke dapur, semua tercatat rapi.</h1>
          <p className="mt-4 text-muted-foreground">Kasir, meja, resep, stok bahan, hingga laba rugi dalam satu sistem.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm fade-up" data-testid="pin-login-form">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Coffee className="h-5 w-5" /></span>
            <div>
              <p className="text-xl font-bold">Kedai POS</p>
              <p className="text-sm text-muted-foreground">Masukkan PIN untuk mulai shift</p>
            </div>
          </div>
          <div className="mb-6 flex justify-center gap-3" data-testid="pin-dots">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={`h-4 w-4 rounded-full border transition-all duration-200 ${i < pin.length ? "scale-110 border-primary bg-primary" : "border-border"}`} />
            ))}
          </div>
          <input
            data-testid="pin-input"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            type="password"
            autoFocus
            className="sr-only"
            aria-label="PIN"
          />
          <div className="grid grid-cols-3 gap-3">
            {KEYS.map((k) => (
              <button
                type="button"
                key={k}
                data-testid={`pin-key-${k}`}
                onClick={() => press(k)}
                className="grid h-16 place-items-center rounded-2xl border border-border bg-card font-mono text-2xl font-semibold transition-transform duration-150 hover:border-primary/60 active:scale-95"
              >
                {k === "back" ? <Delete className="h-5 w-5" /> : k === "clear" ? <span className="text-sm font-sans text-muted-foreground">Hapus</span> : k}
              </button>
            ))}
          </div>
          {error && <p data-testid="pin-error" className="mt-4 text-center text-sm text-destructive">{error}</p>}
          <button
            data-testid="pin-submit-button"
            type="submit"
            disabled={busy}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Lock className="h-4 w-4" /> {busy ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
