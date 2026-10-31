import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { api, errMsg, rp } from "@/lib/api";
import { FinanceError, LoadingPanel } from "./FinanceShared";

export default function FinanceDashboard() {
  const [summary, setSummary] = useState({
    kas_bank_akhir: 0,
    persediaan_bahan_baku: 0,
    total_aset: 0,
    total_liabilitas_ekuitas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { data: response } = await api.get("/v1/finance/dashboard-summary");
      setSummary(response.data);
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Dashboard & Neraca Keuangan" subtitle="Ringkasan saldo kas, bank, aset, liabilitas, ekuitas, dan persediaan.">
        <button type="button" onClick={load} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary">Perbarui</button>
      </PageHeader>
      {error && <div className="mb-5"><FinanceError message={error} onRetry={load} /></div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kas & bank" value={rp(summary.kas_bank_akhir)} />
        <StatCard label="Total aset" value={rp(summary.total_aset)} />
        <StatCard label="Persediaan bahan baku" value={rp(summary.persediaan_bahan_baku)} />
        <StatCard label="Liabilitas + ekuitas" value={rp(summary.total_liabilitas_ekuitas)} />
      </div>
      {loading && <LoadingPanel />}
    </div>
  );
}
