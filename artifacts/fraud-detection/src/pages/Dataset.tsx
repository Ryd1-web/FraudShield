import { useEffect, useState } from "react";
import { useListTransactions, useGetDashboardStats } from "@workspace/api-client-react";
import { formatNGN, formatTxType, getRiskBg, getFraudLabelBg } from "@/lib/utils";
import { BROWSER_TRANSACTIONS_CHANGED, getBrowserTransactions, type BrowserTransaction } from "@/lib/browserTransactions";
import { computeBrowserStats, exportBrowserCsv, mergeDashboardStats } from "@/lib/browserAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, Database } from "lucide-react";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function Dataset() {
  const [browserTransactions, setBrowserTransactions] = useState<BrowserTransaction[]>(() => getBrowserTransactions());

  useEffect(() => {
    const refreshBrowserTransactions = () => setBrowserTransactions(getBrowserTransactions());

    window.addEventListener(BROWSER_TRANSACTIONS_CHANGED, refreshBrowserTransactions);
    window.addEventListener("storage", refreshBrowserTransactions);

    return () => {
      window.removeEventListener(BROWSER_TRANSACTIONS_CHANGED, refreshBrowserTransactions);
      window.removeEventListener("storage", refreshBrowserTransactions);
    };
  }, []);

  const { data: txData, isLoading: txLoading } = useListTransactions({ limit: 10 });
  const { data: stats } = useGetDashboardStats();
  const hasBrowserTransactions = browserTransactions.length > 0;
  const browserStats = computeBrowserStats(browserTransactions);
  const effectiveStats = mergeDashboardStats(stats as any, browserStats);
  const apiTransactions = txData?.transactions ?? [];
  const apiIds = new Set(apiTransactions.map(tx => tx.id));
  const sampleTransactions = [
    ...apiTransactions,
    ...browserTransactions.filter(tx => !apiIds.has(tx.id)),
  ]
    .sort((a, b) => new Date(b.createdAt ?? b.timestamp).getTime() - new Date(a.createdAt ?? a.timestamp).getTime())
    .slice(0, 10);

  const handleExport = () => {
    if (hasBrowserTransactions) {
      exportBrowserCsv(browserTransactions);
      return;
    }

    const a = document.createElement("a");
    a.href = "/api/analytics/export";
    a.download = "fraud_detection_dataset.csv";
    a.click();
  };

  const labelDist = [
    { name: "Clean", value: effectiveStats.totalTransactions - effectiveStats.flaggedTransactions, color: "#10b981" },
    { name: "Suspicious", value: effectiveStats.flaggedTransactions - effectiveStats.fraudulentTransactions, color: "#f59e0b" },
    { name: "Fraudulent", value: effectiveStats.fraudulentTransactions, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const typeData = effectiveStats.byType.map((t, i) => ({
    name: formatTxType(t.type),
    count: t.count,
    fraud: t.fraudCount,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const locationData = effectiveStats.byLocation.slice(0, 8);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dataset Explorer</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Synthetic African mobile money dataset - {effectiveStats.totalTransactions} transactions generated
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Dataset Info Card */}
      <div className="bg-card border border-card-border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Dataset Characteristics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: "Total Records", value: effectiveStats.totalTransactions.toLocaleString() },
            { label: "Fraud Rate", value: `${(effectiveStats.fraudRate * 100).toFixed(1)}%` },
            { label: "Total Volume", value: formatNGN(effectiveStats.totalAmount) },
            { label: "Avg Risk Score", value: `${effectiveStats.avgRiskScore} / 100` },
            { label: "Countries", value: "Nigeria (NGN)" },
            { label: "Transaction Types", value: "7 types" },
            { label: "Coverage", value: "20 Nigerian cities" },
            { label: "Model", value: "Synthetic (CBN-calibrated)" },
          ].map(item => (
            <div key={item.label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-semibold mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Synthetic Data Methodology:</strong> This dataset is generated using statistical parameters
          derived from published reports by the Nigerian Inter-Bank Settlement System (NIBSS), CBN Financial
          Stability Reports, and academic literature on West African mobile money fraud patterns. It is not
          derived from real user data. Phone numbers, device IDs, and transaction amounts are procedurally
          generated to reflect realistic distributions without compromising any individual's privacy.
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Label Distribution */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">Label Distribution</h2>
          {labelDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={labelDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" nameKey="name">
                    {labelDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, "Transactions"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {labelDist.map(d => (
                  <div key={d.name} className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-medium">{d.value} ({effectiveStats.totalTransactions ? ((d.value / effectiveStats.totalTransactions) * 100).toFixed(1) : 0}%)</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>

        {/* Transaction Types */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-lg p-5">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">Transaction Types</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="fraud" name="Fraud" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Location distribution */}
      {locationData.length > 0 && (
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">Geographic Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={locationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="location" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Total" fill="#6366f1" radius={[0, 3, 3, 0]} />
              <Bar dataKey="fraudCount" name="Fraud" fill="#ef4444" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sample Records */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Sample Records (Latest 10)</h2>
          <button onClick={handleExport} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Download className="h-3 w-3" /> Download full dataset
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                {["ID", "Type", "Amount (NGN)", "Location", "Phone", "Account Age", "Prev Tx", "Risk", "Label"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {txLoading && !hasBrowserTransactions ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>)}</tr>
                ))
              ) : sampleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No records yet. Use the Simulator to generate data.
                  </td>
                </tr>
              ) : sampleTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-muted-foreground">{tx.id}</td>
                  <td className="px-4 py-3">{formatTxType(tx.type)}</td>
                  <td className="px-4 py-3 font-medium">{tx.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">{tx.senderLocation}</td>
                  <td className="px-4 py-3 font-mono">{tx.senderPhone}</td>
                  <td className="px-4 py-3">{tx.accountAge}d</td>
                  <td className="px-4 py-3">{tx.previousTxCount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${getRiskBg(tx.riskScore)}`}>{tx.riskScore}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${getFraudLabelBg(tx.fraudLabel)}`}>{tx.fraudLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
