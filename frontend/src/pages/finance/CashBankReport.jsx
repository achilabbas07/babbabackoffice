import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { api, errMsg, rp } from "@/lib/api";
import { FinanceError, FinanceTable, LoadingPanel, Money } from "./FinanceShared";

export default function CashBankReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/finance/cash-flow");
      setRows(data);
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const moneyIn = rows.reduce((total, row) => total + Number(row.money_in || 0), 0);
  const moneyOut = rows.reduce((total, row) => total + Number(row.money_out || 0), 0);

  return (
    <div>
      <PageHeader title="Buku Kas & Bank" subtitle="Mutasi kas dan bank dari jurnal umum, penjualan, pembelian, dan pengeluaran. Data diperbarui otomatis setiap 30 detik.">
        <button type="button" onClick={load} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary">Perbarui</button>
      </PageHeader>
      {error && <div className="mb-5"><FinanceError message={error} onRetry={load} /></div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total uang masuk" value={rp(moneyIn)} tone="text-emerald-600" />
        <StatCard label="Total uang keluar" value={rp(moneyOut)} tone="text-destructive" />
        <StatCard label="Arus kas bersih" value={rp(moneyIn - moneyOut)} />
      </div>
      {loading ? <LoadingPanel /> : (
        <FinanceTable
          rows={rows}
          emptyText="Belum ada mutasi kas atau bank."
          columns={[
            { key: "entry_date", label: "Tanggal", render: (row) => row.entry_date ? new Date(`${row.entry_date}T00:00:00`).toLocaleDateString("id-ID") : "-" },
            { key: "description", label: "Keterangan" },
            { key: "account_name", label: "Akun" },
            { key: "money_in", label: "Uang masuk", className: "text-right", render: (row) => <Money value={row.money_in} className="text-emerald-700" /> },
            { key: "money_out", label: "Uang keluar", className: "text-right", render: (row) => <Money value={row.money_out} className="text-destructive" /> },
          ]}
        />
      )}
    </div>
  );
}
