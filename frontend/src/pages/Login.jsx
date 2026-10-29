import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Delete, Lock, ArrowLeft, UserRound, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { BrandLogo } from "@/components/BrandLogo";
import { api, errMsg, ROLE_LABEL } from "@/lib/api";
import { Button } from "@/components/ui/button";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];
const ROLE_TONE = { admin: "bg-blue-100 text-blue-700", kasir: "bg-emerald-100 text-emerald-700", waiter: "bg-amber-100 text-amber-700" };

const SupabaseLoginForm = ({ onSubmit }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(email.trim(), password);
    } catch (loginError) {
      setError(loginError.message || "Gagal masuk ke Supabase.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" data-testid="supabase-login-form">
      <label className="block space-y-1 text-sm font-medium">
        Email
        <input
          data-testid="supabase-email-input"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
        />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        Password Supabase
        <input
          data-testid="supabase-password-input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
        />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button data-testid="supabase-login-submit" type="submit" className="h-11 w-full" disabled={busy}>
        {busy ? "Memverifikasi..." : "Lanjut ke PIN POS"}
      </Button>
    </form>
  );
};

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
  const {
    user,
    login,
    logout,
    signInSupabase,
    supabaseSession,
    supabaseRole,
    supabaseReady,
    supabaseConfigError,
  } = useAuth();
  const brand = useProfile();
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!supabaseReady) return undefined;
    if (supabaseConfigError) {
      setUsersError(supabaseConfigError);
      setUsersLoading(false);
      return undefined;
    }
    if (!supabaseSession) {
      setUsers([]);
      setSelected(null);
      setUsersError("");
      setUsersLoading(false);
      return undefined;
    }
    setUsersLoading(true);
    setSelected(null);
    if (!process.env.REACT_APP_BACKEND_URL?.trim()) {
      setUsersError("Backend belum dikonfigurasi. Atur REACT_APP_BACKEND_URL di Vercel, lalu deploy ulang.");
      setUsersLoading(false);
      return undefined;
    }

    api.get("/auth/users")
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new Error("Respons backend tidak valid. Endpoint /api/auth/users harus mengembalikan daftar pengguna.");
        }
        const matchingUsers = data.filter((candidate) => candidate.role === supabaseRole);
        setUsers(matchingUsers);
        setUsersError(matchingUsers.length
          ? ""
          : `Tidak ada user POS dengan role ${ROLE_LABEL[supabaseRole] || "yang sesuai"} untuk akun Supabase ini.`);
      })
      .catch((err) => {
        setUsers([]);
        setUsersError(errMsg(err));
      })
      .finally(() => setUsersLoading(false));
    return undefined;
  }, [supabaseReady, supabaseConfigError, supabaseSession, supabaseRole]);

  if (user) return <Navigate to="/pos" replace />;
  const { profile, appName } = brand;
  const handleSupabaseLogout = async () => {
    try {
      await logout();
    } catch (error) {
      setUsersError(error.message || "Gagal mengakhiri sesi Supabase.");
    }
  };

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
            <BrandLogo url={profile.logo_url} className="h-11 w-11" testid="login-brand-logo" />
            <div className="min-w-0">
              <p data-testid="login-brand-name" className="truncate text-xl font-bold">{appName}</p>
              <p className="text-sm text-muted-foreground">
                {!supabaseSession ? "Masuk dengan akun Supabase" : selected ? "Masukkan PIN POS Anda" : "Pilih user POS"}
              </p>
            </div>
          </div>
          {!supabaseReady ? (
            <p role="status" className="text-center text-sm text-muted-foreground">Memeriksa sesi...</p>
          ) : supabaseConfigError ? (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{supabaseConfigError}</p>
          ) : !supabaseSession ? (
            <SupabaseLoginForm onSubmit={signInSupabase} />
          ) : !supabaseRole ? (
            <div className="space-y-3">
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Akun Supabase tidak memiliki `app_metadata.pos_role` yang valid.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={handleSupabaseLogout}>
                <LogOut className="h-4 w-4" /> Keluar dari Supabase
              </Button>
            </div>
          ) : selected ? <PinPad selected={selected} onBack={() => setSelected(null)} onSubmit={(pin) => login(selected.id, pin)} /> : usersLoading ? (
            <p role="status" className="text-center text-sm text-muted-foreground">Memuat daftar pengguna...</p>
          ) : usersError ? (
            <div className="space-y-3">
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{usersError}</p>
              <Button type="button" variant="outline" className="w-full" onClick={handleSupabaseLogout}>
                <LogOut className="h-4 w-4" /> Keluar dari Supabase
              </Button>
            </div>
          ) : users.length ? (
            <div className="space-y-4">
              <p className="text-center text-xs text-muted-foreground">
                Sesi Supabase aktif · Role {ROLE_LABEL[supabaseRole]}
              </p>
              <UserPicker users={users} onPick={setSelected} />
              <Button type="button" variant="outline" className="w-full" onClick={handleSupabaseLogout}>
                <LogOut className="h-4 w-4" /> Ganti akun Supabase
              </Button>
            </div>
          ) : (
            <p role="status" className="text-center text-sm text-muted-foreground">Belum ada pengguna. Tambahkan pengguna melalui backend.</p>
          )}
        </div>
      </div>
    </div>
  );
}
