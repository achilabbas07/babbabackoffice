import { useRef, useState } from "react";
import { Armchair, Store } from "lucide-react";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { fmtTime } from "@/lib/api";

export const CELL = 180;
const PAD = 20;
const TILE = 160;

export const STATUS = {
  available: { label: "Kosong", dot: "bg-emerald-500", text: "text-emerald-700" },
  occupied: { label: "Terisi", dot: "bg-rose-500", text: "text-rose-600" },
  paid: { label: "Lunas (Kosongkan)", dot: "bg-blue-500", text: "text-blue-600" },
  reserved: { label: "Reservasi", dot: "bg-amber-500", text: "text-amber-600" },
};

export const autoLayout = (tables) => {
  const pos = {};
  const byArea = {};
  tables.forEach((t) => (byArea[t.area] = [...(byArea[t.area] || []), t]));
  Object.values(byArea).forEach((list) => {
    const used = new Set();
    list.filter((t) => t.x != null && t.y != null).forEach((t) => { pos[t.id] = { x: t.x, y: t.y }; used.add(`${t.x},${t.y}`); });
    let i = 0;
    list.filter((t) => t.x == null || t.y == null).forEach((t) => {
      while (used.has(`${i % 8},${Math.floor(i / 8)}`)) i += 1;
      pos[t.id] = { x: i % 8, y: Math.floor(i / 8) };
      used.add(`${i % 8},${Math.floor(i / 8)}`);
    });
  });
  return pos;
};

const shortRp = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v);

const Tile = ({ t, editing }) => {
  const fixture = t.kind === "fixture";
  const s = STATUS[t.status] || STATUS.available;
  const Icon = fixture ? Store : Armchair;
  const od = t.orderData;
  const busy = !editing && t.status === "occupied" && od;
  return (
    <div className={`w-full px-2 ${fixture ? "text-slate-500" : s.text}`}>
      <Icon className={`mx-auto ${busy ? "h-7 w-7" : "h-10 w-10"}`} strokeWidth={2.2} />
      <p className="mt-1 truncate text-base font-bold">{t.name}</p>
      {busy && (
        <>
          <p data-testid={`table-tile-customer-${t.id}`} className="truncate text-xs font-medium text-slate-600">{od.customerName || "Umum"}</p>
          <p data-testid={`table-tile-time-${t.id}`} className="font-mono text-xs">{fmtTime(od.startTime)} · {shortRp(od.total || 0)}</p>
        </>
      )}
    </div>
  );
};

export const FloorCanvas = ({ tables, positions, setPositions, editing, onTileClick, onDelete }) => {
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const [ghost, setGhost] = useState(null);

  const cols = Math.max(10, ...tables.map((t) => (positions[t.id]?.x ?? 0) + 2));
  const rows = Math.max(4, ...tables.map((t) => (positions[t.id]?.y ?? 0) + 2));

  const down = (e, t) => {
    if (!editing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const p = positions[t.id];
    drag.current = { id: t.id, dx: e.clientX - rect.left - (PAD + p.x * CELL), dy: e.clientY - rect.top - (PAD + p.y * CELL), sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 5) d.moved = true;
    if (!d.moved) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setGhost({ id: d.id, left: e.clientX - rect.left - d.dx, top: e.clientY - rect.top - d.dy });
  };
  const up = (e, t) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    setGhost(null);
    if (!d.moved) return onTileClick(t);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.round((e.clientX - rect.left - d.dx - PAD) / CELL));
    const y = Math.max(0, Math.round((e.clientY - rect.top - d.dy - PAD) / CELL));
    setPositions((prev) => {
      const next = { ...prev };
      const other = tables.find((o) => o.id !== d.id && next[o.id]?.x === x && next[o.id]?.y === y);
      if (other) next[other.id] = prev[d.id];
      next[d.id] = { x, y };
      return next;
    });
  };

  return (
    <div className="overflow-auto rounded-3xl border border-border bg-white shadow-sm" data-testid="floor-canvas">
      <div
        ref={canvasRef}
        className="relative min-w-full"
        style={{ width: cols * CELL + PAD, height: rows * CELL + PAD, backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      >
        {tables.map((t) => {
          const p = positions[t.id] || { x: 0, y: 0 };
          const g = ghost?.id === t.id ? ghost : null;
          return (
            <div
              key={t.id}
              data-testid={`table-tile-${t.id}`}
              onPointerDown={(e) => down(e, t)}
              onPointerMove={move}
              onPointerUp={(e) => up(e, t)}
              onClick={() => !editing && onTileClick(t)}
              style={{ left: g ? g.left : PAD + p.x * CELL, top: g ? g.top : PAD + p.y * CELL, width: TILE, height: TILE, touchAction: editing ? "none" : "auto" }}
              className={`absolute grid select-none place-items-center rounded-2xl bg-[#eef1f5] text-center shadow-[5px_5px_12px_#cdd4dd,-5px_-5px_12px_#ffffff] ${
                g ? "z-20 cursor-grabbing scale-105" : "transition-[left,top,transform] duration-150"
              } ${editing ? "cursor-grab outline-dashed outline-2 outline-offset-2 outline-primary/40" : t.kind === "fixture" ? "cursor-default" : "cursor-pointer hover:-translate-y-0.5"}`}
            >
              <Tile t={t} editing={editing} />
              {editing && t.status !== "occupied" && (
                <span className="absolute -right-3 -top-3 rounded-lg bg-white shadow" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  <ConfirmDelete testid={`table-delete-${t.id}`} title={`Hapus ${t.name}?`} onConfirm={() => onDelete(t)} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
