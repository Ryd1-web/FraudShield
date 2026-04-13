import { useState } from "react";
import { useGenerateTransactions, useResetSimulator } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetDashboardStatsQueryKey, getListTransactionsQueryKey, getGetFraudAlertsQueryKey } from "@workspace/api-client-react";
import { formatNGN, formatTxType, getRiskBg, getFraudLabelBg } from "@/lib/utils";
import { Database, RefreshCw, Trash2, Play } from "lucide-react";

const NIGERIAN_CITIES = [
  "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City",
  "Maiduguri", "Zaria", "Jos", "Enugu", "Abeokuta", "Onitsha",
  "Warri", "Sokoto", "Ilorin", "Aba", "Asaba", "Calabar",
];

const TX_TYPES = ["send", "receive", "withdraw", "agent_deposit", "agent_withdrawal", "airtime", "bill_payment"];

export default function Simulator() {
  const queryClient = useQueryClient();
  const generateMutation = useGenerateTransactions();
  const resetMutation = useResetSimulator();

  const [config, setConfig] = useState({
    count: 20,
    fraudRate: 0.15,
    location: "Lagos",
    amountMin: 500,
    amountMax: 200000,
    includeAgentTransactions: true,
    transactionTypes: [] as string[],
  });

  const [result, setResult] = useState<any>(null);

  const handleGenerate = () => {
    generateMutation.mutate({
      count: config.count,
      fraudRate: config.fraudRate,
      location: config.location,
      amountRange: { min: config.amountMin, max: config.amountMax },
      includeAgentTransactions: config.includeAgentTransactions,
      transactionTypes: config.transactionTypes,
    }, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFraudAlertsQueryKey() });
      },
    });
  };

  const handleReset = () => {
    if (!confirm("Reset all transaction data? This cannot be undone.")) return;
    resetMutation.mutate({}, {
      onSuccess: () => {
        setResult(null);
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFraudAlertsQueryKey() });
      },
    });
  };

  const toggleType = (type: string) => {
    setConfig(c => ({
      ...c,
      transactionTypes: c.transactionTypes.includes(type)
        ? c.transactionTypes.filter(t => t !== type)
        : [...c.transactionTypes, type],
    }));
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction Simulator</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate synthetic Nigerian mobile money transactions for research analysis</p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive text-destructive hover:bg-red-50 text-sm font-medium transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Reset All Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Generator Configuration</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Number of Transactions</label>
            <input
              type="number"
              min={1} max={100}
              value={config.count}
              onChange={e => setConfig(c => ({ ...c, count: Number(e.target.value) }))}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
            />
            <p className="text-xs text-muted-foreground">Maximum 100 per batch</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fraud Rate: {Math.round(config.fraudRate * 100)}%</label>
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={config.fraudRate}
              onChange={e => setConfig(c => ({ ...c, fraudRate: Number(e.target.value) }))}
              className="w-full accent-red-600"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0% (All Clean)</span>
              <span>100% (All Fraud)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Primary Location</label>
            <select
              value={config.location}
              onChange={e => setConfig(c => ({ ...c, location: e.target.value }))}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
            >
              {NIGERIAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount Range (NGN)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Minimum</p>
                <input
                  type="number"
                  min={100}
                  value={config.amountMin}
                  onChange={e => setConfig(c => ({ ...c, amountMin: Number(e.target.value) }))}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Maximum</p>
                <input
                  type="number"
                  min={100}
                  value={config.amountMax}
                  onChange={e => setConfig(c => ({ ...c, amountMax: Number(e.target.value) }))}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Transaction Types (leave empty for all)</label>
            <div className="flex flex-wrap gap-2">
              {TX_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    config.transactionTypes.includes(type)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {formatTxType(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Include Agent Transactions</label>
            <button
              onClick={() => setConfig(c => ({ ...c, includeAgentTransactions: !c.includeAgentTransactions }))}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                config.includeAgentTransactions ? "bg-primary" : "bg-muted"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                config.includeAgentTransactions ? "translate-x-5" : "translate-x-1"
              }`} />
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {generateMutation.isPending ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Play className="h-4 w-4" /> Generate Transactions</>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              {/* Summary */}
              <div className="bg-card border border-card-border rounded-lg p-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Batch Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Total", value: result.summary.total, color: "text-blue-600" },
                    { label: "Clean", value: result.summary.total - result.summary.flagged, color: "text-emerald-600" },
                    { label: "Suspicious", value: result.summary.flagged - result.summary.fraudulent, color: "text-amber-600" },
                    { label: "Fraudulent", value: result.summary.fraudulent, color: "text-red-600" },
                    { label: "Avg Risk", value: result.summary.avgRiskScore, color: "text-orange-600" },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Total volume: <strong>{formatNGN(result.summary.totalAmount)}</strong>
                </p>
              </div>

              {/* Transaction table */}
              <div className="bg-card border border-card-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Generated Transactions</h2>
                </div>
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {["Transaction ID", "Type", "Amount", "Location", "Phone", "Risk Score", "Label"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {result.transactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.id}</td>
                          <td className="px-4 py-3 text-xs">{formatTxType(tx.type)}</td>
                          <td className="px-4 py-3 text-xs font-medium">{formatNGN(tx.amount)}</td>
                          <td className="px-4 py-3 text-xs">{tx.senderLocation}</td>
                          <td className="px-4 py-3 text-xs font-mono">{tx.senderPhone}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getRiskBg(tx.riskScore)}`}>
                              {tx.riskScore}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getFraudLabelBg(tx.fraudLabel)}`}>
                              {tx.fraudLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!result && !generateMutation.isPending && (
            <div className="bg-card border border-card-border rounded-lg flex flex-col items-center justify-center py-24 text-center">
              <Database className="h-10 w-10 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Configure parameters and click Generate</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Synthetic transactions will appear here with real-time fraud analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
