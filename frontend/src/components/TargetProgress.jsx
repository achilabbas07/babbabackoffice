import { Target } from "lucide-react";

const tone = (pct) => (pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500");

export const TargetBar = ({ item, testid }) => (
  <div data-testid={testid}>
    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 font-medium"><Target className="h-3.5 w-3.5 text-primary" />{item.productName}</span>
      <span className="font-mono text-xs">
        <span className="text-base font-bold text-foreground">{item.achieved}</span>
        <span className="text-muted-foreground"> / {item.targetQty}</span>
        {item.achieved >= item.targetQty && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">TERCAPAI</span>}
      </span>
    </div>
    <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
      <div className={`h-full rounded-full transition-[width] duration-500 ${tone(item.pct)}`} style={{ width: `${item.pct}%` }} />
    </div>
  </div>
);

export const ProgressCard = ({ p, children }) => (
  <div data-testid={`target-progress-${p.waiterId}`} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold">{p.waiterName}</p>
        <p className="font-mono text-xs text-muted-foreground">{p.shiftId} · mulai {new Date(p.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      {children}
    </div>
    {p.items.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada target yang berlaku.</p> : (
      <div className="space-y-4">{p.items.map((i) => <TargetBar key={i.targetId} item={i} testid={`target-bar-${p.waiterId}-${i.productId}`} />)}</div>
    )}
  </div>
);
