import { AlertCircle } from "lucide-react";
import { rp } from "@/lib/api";

export const FinanceError = ({ message, onRetry }) => (
  <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
    <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{message}</span>
    {onRetry && <button type="button" className="font-semibold underline" onClick={onRetry}>Coba lagi</button>}
  </div>
);

export const FinanceTable = ({ columns, rows, emptyText = "Belum ada data." }) => (
  <div className="overflow-x-auto rounded-2xl border border-border bg-card">
    <table className="w-full min-w-[640px] text-sm">
      <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
        <tr>{columns.map((column) => <th key={column.key} className={`px-4 py-3 font-semibold ${column.className || ""}`}>{column.label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.length ? rows.map((row, index) => (
          <tr key={row.id || row.entry_id || `${row.account_name}-${index}`} className="hover:bg-secondary/30">
            {columns.map((column) => (
              <td key={column.key} className={`px-4 py-3 ${column.className || ""}`}>
                {column.render ? column.render(row) : row[column.key] ?? "-"}
              </td>
            ))}
          </tr>
        )) : (
          <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">{emptyText}</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

export const Money = ({ value, className = "" }) => (
  <span className={`font-mono tabular-nums ${className}`}>{rp(Number(value) || 0)}</span>
);

export const LoadingPanel = () => (
  <div role="status" className="rounded-2xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
    Memuat laporan keuangan...
  </div>
);
