import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LogOut, Maximize, Minimize } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { NAV } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/api";
import { ShiftGate } from "@/components/ShiftGate";
import { WaiterPrinterButton } from "@/components/WaiterPrinterButton";

const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span data-testid="header-clock" className="font-mono text-sm text-muted-foreground tabular-nums">
      {now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })} · {now.toLocaleTimeString("id-ID")}
    </span>
  );
};

const FullscreenButton = () => {
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFull(Boolean(
      document.fullscreenElement
      || document.webkitFullscreenElement
      || document.body.classList.contains("app-fullscreen-fallback"),
    ));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    onChange();
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);
  const toggle = async () => {
    const fallbackActive = document.body.classList.contains("app-fullscreen-fallback");
    if (fallbackActive) {
      document.body.classList.remove("app-fullscreen-fallback");
      setIsFull(false);
      return;
    }

    const activateInPageFullscreen = () => {
      document.body.classList.add("app-fullscreen-fallback");
      setIsFull(true);
    };

    try {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      if (fullscreenElement) {
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        if (!exitFullscreen) {
          activateInPageFullscreen();
          toast.info("Browser membatasi layar penuh; tampilan penuh di halaman diaktifkan.");
          return;
        }
        await exitFullscreen.call(document);
        return;
      }

      const root = document.documentElement;
      const requestFullscreen = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!requestFullscreen) {
        activateInPageFullscreen();
        toast.info("Browser membatasi layar penuh; tampilan penuh di halaman diaktifkan.");
        return;
      }
      await requestFullscreen.call(root);
    } catch (error) {
      activateInPageFullscreen();
      console.warn("Browser fullscreen was denied; using the in-page fallback.", error);
      toast.info("Tampilan aplikasi diperluas. Bilah browser tetap terlihat karena izin layar penuh tidak diberikan.");
    }
  };
  const Icon = isFull ? Minimize : Maximize;
  return (
    <button
      data-testid="fullscreen-toggle-button"
      type="button"
      onClick={toggle}
      title={isFull ? "Keluar layar penuh" : "Layar penuh"}
      className="grid h-10 w-10 touch-manipulation place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};

const Brand = ({ rail }) => {
  const { profile, appName } = useProfile();
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${rail ? "md:justify-center 2xl:justify-start" : ""}`}>
      <BrandLogo url={profile.logo_url} testid={rail ? "brand-logo" : "brand-logo-mobile"} />
      <div className={`min-w-0 leading-tight ${rail ? "md:hidden 2xl:block" : ""}`}>
        <p data-testid={rail ? "brand-name" : "brand-name-mobile"} className="max-w-[160px] truncate font-bold tracking-tight">{appName}</p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">F&amp;B System</p>
      </div>
    </div>
  );
};

const NavItem = ({ to, label, icon: Icon, prefix }) => (
  <NavLink
    to={to}
    data-testid={`${prefix}-${to.slice(1)}`}
    className={({ isActive }) =>
      `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
        prefix === "nav" ? "md:flex-col md:gap-1 md:px-1 md:py-2 md:text-center md:text-[10px] md:leading-tight 2xl:flex-row 2xl:gap-3 2xl:px-3 2xl:py-2.5 2xl:text-left 2xl:text-sm" : ""
      } ${
        isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`
    }
  >
    <Icon className={`h-4 w-4 shrink-0 ${prefix === "nav" ? "md:h-5 md:w-5 2xl:h-4 2xl:w-4" : ""}`} />
    <span>{label}</span>
  </NavLink>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const items = NAV.filter((n) => n.roles.includes(user.role));
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error(error.message || "Gagal mengakhiri sesi.");
    }
  };
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col border-r border-border bg-card md:flex 2xl:w-64">
        <div className="px-3 py-4 2xl:px-5 2xl:py-5"><Brand rail /></div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-6 2xl:px-3">
          {items.map((n) => <NavItem key={n.to} {...n} prefix="nav" />)}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 border-b border-border">
          <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
            <div className="md:hidden"><Brand /></div>
            <div className="hidden sm:block"><Clock /></div>
            <div className="flex items-center gap-3">
              {user.role === "waiter" && <WaiterPrinterButton />}
              <FullscreenButton />
              <div className="text-right leading-tight">
                <p data-testid="header-user-name" className="text-sm font-semibold">{user.name}</p>
                <p data-testid="header-user-role" className="text-[11px] uppercase tracking-widest text-primary">{ROLE_LABEL[user.role]}</p>
              </div>
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            {items.map((n) => <NavItem key={n.to} {...n} prefix="mobile-nav" />)}
          </nav>
        </header>
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:px-6">
          <ShiftGate><Outlet /></ShiftGate>
        </main>
      </div>
    </div>
  );
}
