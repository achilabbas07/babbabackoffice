import { useMemo, useState } from "react";
import { Search, UtensilsCrossed } from "lucide-react";
import { rp } from "@/lib/api";

export const ProductGrid = ({ products, onAdd }) => {
  const [cat, setCat] = useState("Semua");
  const [q, setQ] = useState("");
  const cats = useMemo(() => ["Semua", ...new Set(products.map((p) => p.category))], [products]);
  const list = products.filter((p) => (cat === "Semua" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="pos-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari menu..."
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c}
              data-testid={`pos-category-${c.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setCat(c)}
              className={`h-11 shrink-0 rounded-xl px-4 text-sm font-medium transition-colors ${cat === c ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {list.map((p, i) => (
          <button
            key={p.id}
            data-testid={`pos-product-${p.id}`}
            onClick={() => onAdd(p)}
            style={{ animationDelay: `${i * 30}ms` }}
            className="fade-up group overflow-hidden rounded-2xl border border-border bg-card text-left transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/50 active:scale-[0.98]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-secondary">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground"><UtensilsCrossed className="h-8 w-8" /></div>
              )}
            </div>
            <div className="p-3.5">
              <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{p.category}</p>
              <p className="mt-2 font-mono text-sm font-semibold text-primary">{rp(p.price)}</p>
            </div>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Menu tidak ditemukan.</p>}
    </div>
  );
};
