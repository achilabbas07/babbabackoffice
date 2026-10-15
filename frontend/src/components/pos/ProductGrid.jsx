import { useMemo, useState } from "react";
import { Search, UtensilsCrossed } from "lucide-react";
import { rp } from "@/lib/api";

export const ProductGrid = ({ products, onAdd, ojol }) => {
  const [cat, setCat] = useState("Semua");
  const [q, setQ] = useState("");
  const cats = useMemo(() => ["Semua", ...new Set(products.map((p) => p.category))], [products]);
  const list = products.filter((p) => (cat === "Semua" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="pos-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari menu..."
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c}
              data-testid={`pos-category-${c.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setCat(c)}
              className={`h-10 shrink-0 rounded-xl px-3.5 text-sm font-medium transition-colors ${cat === c ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
        {list.map((p, i) => (
          <button
            key={p.id}
            data-testid={`pos-product-${p.id}`}
            onClick={() => onAdd(p)}
            style={{ animationDelay: `${i * 30}ms` }}
            className="fade-up group overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/60 active:scale-[0.97]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-secondary">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground"><UtensilsCrossed className="h-8 w-8" /></div>
              )}
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 min-h-[2.25rem] text-[13px] font-semibold leading-snug">{p.name}</p>
              <p data-testid={`pos-product-price-${p.id}`} className="mt-1 font-mono text-xs font-semibold text-primary">
                {rp(ojol && p.price_ojol > 0 ? p.price_ojol : p.price)}{ojol && <span className="ml-1 font-sans text-[10px] text-muted-foreground">Ojol</span>}
              </p>
            </div>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Menu tidak ditemukan.</p>}
    </div>
  );
};
