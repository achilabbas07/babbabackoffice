import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Coffee, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NAV } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/api";

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

const Brand = ({ rail }) => (
  <div className={`flex items-center gap-2.5 ${rail ? "md:justify-center 2xl:justify-start" : ""}`}>
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Coffee className="h-5 w-5" /></span>
    <div className={`leading-tight ${rail ? "md:hidden 2xl:block" : ""}`}>
      <p className="font-bold tracking-tight">Kedai POS</p>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">F&amp;B System</p>
    </div>
  </div>
);

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
              <div className="text-right leading-tight">
                <p data-testid="header-user-name" className="text-sm font-semibold">{user.name}</p>
                <p data-testid="header-user-role" className="text-[11px] uppercase tracking-widest text-primary">{ROLE_LABEL[user.role]}</p>
              </div>
              <button
                data-testid="logout-button"
                onClick={logout}
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
