import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { BrandLogo } from "@/components/BrandLogo";
import { errMsg } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { user, login } = useAuth();
  const { profile, appName } = useProfile();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(name.trim(), pin);
    } catch (loginError) {
      setError(errMsg(loginError));
    } finally {
      setLoading(false);
    }
  };

  if (user === null) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memuat...</div>;
  }
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
            <BrandLogo url={profile.logo_url} className="h-11 w-11" testid="login-brand-logo" />
            <div className="min-w-0">
              <p data-testid="login-brand-name" className="truncate text-xl font-bold">{appName}</p>
              <p className="text-sm text-muted-foreground">Masuk dengan nama dan PIN</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
            <label className="block space-y-1 text-sm font-medium">
              Nama
              <input
                data-testid="login-name-input"
                type="text"
                autoComplete="username"
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              PIN
              <input
                data-testid="login-pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                required
                minLength={4}
                maxLength={6}
                pattern="[0-9]{4,6}"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
              />
            </label>
            {error && <p role="alert" data-testid="login-error" className="text-sm text-destructive">{error}</p>}
            <Button data-testid="login-submit" type="submit" className="h-11 w-full" disabled={loading}>
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "Memverifikasi..." : "Masuk"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
