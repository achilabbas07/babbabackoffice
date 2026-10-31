import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { api, errMsg, rp } from "@/lib/api";
import { FinanceError, FinanceTable, LoadingPanel, Money } from "./FinanceShared";

const ASSET_COLORS = ["#2563eb", "#10b981"];

export default function FinanceDashboard() {
  const [summary, setSummary] = useState({
    kas_bank_akhir: 0,
    persediaan_bahan_baku: 0,
    total_aset: 0,
    total_liabilitas_ekuitas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState("");

  const assetComposition = useMemo(() => [
    { name: "Kas & Bank", value: Number(summary.kas_bank_akhir) || 0 },
    { name: "Persediaan Bahan Baku", value: Number(summary.persediaan_bahan_baku) || 0 },
  ], [summary.kas_bank_akhir, summary.persediaan_bahan_baku]);

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

  const loadTransactions = useCallback(async () => {
    setTransactionsError("");
    setTransactionsLoading(true);
    try {
      const { data: response } = await api.get("/v1/finance/recent-transactions");
      setTransactions(response.data);
    } catch (requestError) {
      setTransactionsError(errMsg(requestError));
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const formatTime = (value) => new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

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
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Komposisi Aset</h2>
          {loading ? <LoadingPanel /> : (
            <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetComposition}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {assetComposition.map((entry, index) => (
                        <Cell key={entry.name} fill={ASSET_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => rp(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-3 text-sm">
                {assetComposition.map((entry, index) => (
                  <li key={entry.name} className="flex items-start gap-2">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: ASSET_COLORS[index] }} />
                    <span>
                      <span className="block text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{rp(entry.value)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Riwayat Jurnal Terbaru</h2>
          {transactionsError && <div className="mb-4"><FinanceError message={transactionsError} onRetry={loadTransactions} /></div>}
          {transactionsLoading ? <LoadingPanel /> : (
            <FinanceTable
              rows={transactions}
              emptyText="Belum ada transaksi jurnal."
              columns={[
                { key: "tanggal", label: "Tanggal", render: (row) => formatTime(row.tanggal) },
                { key: "keterangan", label: "Keterangan" },
                { key: "kode_akun", label: "Kode Akun" },
                {
                  key: "nilai",
                  label: "Nilai",
                  className: "text-right whitespace-nowrap",
                  render: (row) => (
                    <span>
                      <Money value={Number(row.debit) > 0 ? row.debit : row.kredit} />
                      {Number(row.debit) <= 0 && Number(row.kredit) > 0 ? " K" : ""}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </section>
      </div>
    </div>
  );
}
