import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { api, errMsg, rp } from "@/lib/api";
import { FinanceError, FinanceTable, LoadingPanel, Money } from "./FinanceShared";

export default function FinanceDashboard() {
  const [cashRows, setCashRows] = useState([]);
  const [balanceRows, setBalanceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { data: response } = await api.get("/v1/finance/dashboard-summary");
      setCashRows(response.data.cash_bank);
      setBalanceRows(response.data.balance_sheet);
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const result = { cash: 0, assets: 0, liabilities: 0, equity: 0, inventory: 0 };
    for (const row of cashRows) result.cash += Number(row.saldo_berjalan) || 0;
    for (const row of balanceRows) {
      const balance = Number(row.balance) || 0;
      if (row.account_type === "asset") result.assets += balance;
      if (row.account_type === "liability") result.liabilities += balance;
      if (row.account_type === "equity") result.equity += balance;
      if (row.account_type === "asset" && /(persediaan bahan baku|persediaan|inventory)/i.test(row.account_name || "")) {
        result.inventory += balance;
      }
    }
    return result;
  }, [balanceRows, cashRows]);

  return (
    <div>
      <PageHeader title="Dashboard & Neraca Keuangan" subtitle="Ringkasan saldo kas, bank, aset, liabilitas, ekuitas, dan persediaan.">
        <button type="button" onClick={load} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary">Perbarui</button>
      </PageHeader>
      {error && <div className="mb-5"><FinanceError message={error} onRetry={load} /></div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kas & bank" value={rp(totals.cash)} />
        <StatCard label="Total aset" value={rp(totals.assets)} />
        <StatCard label="Persediaan bahan baku" value={rp(totals.inventory)} />
        <StatCard label="Liabilitas + ekuitas" value={rp(totals.liabilities + totals.equity)} />
      </div>
      {loading ? <LoadingPanel /> : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Buku Kas & Bank</h2>
            <FinanceTable
              rows={cashRows}
              emptyText="Belum ada saldo kas atau bank."
              columns={[
                { key: "sumber_dana", label: "Sumber dana" },
                { key: "saldo_berjalan", label: "Saldo berjalan", className: "text-right", render: (row) => <Money value={row.saldo_berjalan} /> },
              ]}
            />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Neraca & Persediaan</h2>
            <FinanceTable
              rows={balanceRows}
              emptyText="Belum ada saldo akun di neraca."
              columns={[
                { key: "account_name", label: "Nama akun" },
                { key: "account_type", label: "Kelompok", render: (row) => ({ asset: "Aset", liability: "Liabilitas", equity: "Ekuitas" }[row.account_type] || row.account_type) },
                { key: "balance", label: "Saldo akhir", className: "text-right", render: (row) => <Money value={row.balance} /> },
              ]}
            />
          </section>
        </div>
      )}
    </div>
  );
}
