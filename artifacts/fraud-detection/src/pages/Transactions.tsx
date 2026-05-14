import { useEffect, useState } from "react";
import { useListTransactions, useGetTransaction } from "@workspace/api-client-react";
import { formatNGN, formatTxType, getRiskBg, getFraudLabelBg, formatRelativeTime } from "@/lib/utils";
import { BROWSER_TRANSACTIONS_CHANGED, getBrowserTransactions, type BrowserTransaction } from "@/lib/browserTransactions";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";

function FeatureBar({ feature, importance, direction }: { feature: string; importance: number; direction: string; }) {
  const color = direction === "increases_risk" ? "bg-red-500" : direction === "decreases_risk" ? "bg-emerald-500" : "bg-blue-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{feature}</span>
        <span className={direction === "increases_risk" ? "text-red-600" : direction === "decreases_risk" ? "text-emerald-600" : "text-muted-foreground"}>
          {Math.round(importance * 100)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${importance * 100}%` }} />
      </div>
    </div>
  );
}

function TransactionDetail({ id, localTx, onClose }: { id: string; localTx?: BrowserTransaction; onClose: () => void }) {
  const { data: apiTx, isLoading } = useGetTransaction(
    id,
    { query: { enabled: !localTx } } as any,
  );
  const tx = localTx ?? apiTx;

  if (!localTx && isLoading) return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-2xl p-8 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-muted rounded" />)}</div>
      </div>
    </div>
  );

  if (!tx) return null;

  const analysis = tx.fraudAnalysis as any;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-bold text-lg">{tx.id}</h2>
            <p className="text-sm text-muted-foreground">{formatTxType(tx.type)} · {tx.senderLocation}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Risk score */}
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-black w-16 h-16 rounded-full flex items-center justify-center ${getRiskBg(tx.riskScore)}`}>
              {tx.riskScore}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Risk Score (0–100)</p>
              <span className={`text-sm px-3 py-1 rounded-full font-semibold capitalize ${getFraudLabelBg(tx.fraudLabel)}`}>
                {tx.fraudLabel}
              </span>
            </div>
          </div>

          {/* Transaction details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Amount", formatNGN(tx.amount)],
              ["Currency", tx.currency],
              ["Sender", tx.senderPhone],
              ["Recipient", tx.recipientPhone || "—"],
              ["Location", tx.senderLocation],
              ["Device", tx.deviceId],
              ["Account Age", `${tx.accountAge} days`],
              ["Prior Tx Count", tx.previousTxCount],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* AI Explanation */}
          {analysis?.explanation && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">AI Explanation</p>
              <p className="text-sm text-amber-800">{analysis.explanation}</p>
              <p className="text-xs text-amber-600 mt-1">Model: {analysis.modelUsed} · Confidence: {Math.round((analysis.confidence ?? 0) * 100)}%</p>
            </div>
          )}

          {/* Feature Importance */}
          {analysis?.featureImportance?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Feature Importance (SHAP-style)</p>
              <div className="space-y-3">
                {analysis.featureImportance.map((f: any) => (
                  <div key={f.feature} className="space-y-1">
                    <FeatureBar feature={f.feature} importance={f.importance} direction={f.direction} />
                    <p className="text-xs text-muted-foreground pl-0.5">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Triggered Rules */}
          {analysis?.triggeredRules?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Triggered Rules</p>
              <div className="flex flex-col gap-1.5">
                {analysis.triggeredRules.map((rule: string) => (
                  <div key={rule} className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"riskScore" | "amount" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
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

  const { data, isLoading } = useListTransactions(
    { limit: 200, flaggedOnly },
    ({ query: { refetchInterval: 10000 } } as unknown) as any
  );

  const apiTransactions = data?.transactions ?? [];
  const apiIds = new Set(apiTransactions.map(tx => tx.id));
  const combinedTransactions = [
    ...apiTransactions,
    ...browserTransactions.filter(tx => !apiIds.has(tx.id)),
  ];

  const transactions = combinedTransactions.filter(tx => {
    if (flaggedOnly && tx.fraudLabel === "clean") return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return tx.id.toLowerCase().includes(s) ||
      tx.senderPhone.includes(s) ||
      tx.senderLocation.toLowerCase().includes(s) ||
      tx.fraudLabel.includes(s) ||
      formatTxType(tx.type).toLowerCase().includes(s);
  }).sort((a, b) => {
    const dir = sortDir === "desc" ? -1 : 1;
    if (sortField === "riskScore") return (a.riskScore - b.riskScore) * dir;
    if (sortField === "amount") return (a.amount - b.amount) * dir;
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    sortField === field
      ? sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
      : null
  );

  return (
    <div className="p-8 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transaction Log</h1>
        <p className="text-muted-foreground text-sm mt-1">Full audit trail with fraud analysis for all {combinedTransactions.length} transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID, phone, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-input rounded-lg text-sm bg-background"
          />
        </div>
        <button
          onClick={() => setFlaggedOnly(!flaggedOnly)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            flaggedOnly ? "bg-red-600 text-white border-red-600" : "bg-background border-border text-foreground hover:bg-muted"
          }`}
        >
          Flagged Only
        </button>
        <span className="text-sm text-muted-foreground">{transactions.length} results</span>
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                {["Transaction ID", "Type", "Amount", "Location", "Sender", "Account Age", "Risk Score", "Label", "Time"].map((h, i) => {
                  const field = h === "Risk Score" ? "riskScore" : h === "Amount" ? "amount" : h === "Time" ? "createdAt" : null;
                  return (
                    <th
                      key={h}
                      onClick={field ? () => toggleSort(field as any) : undefined}
                      className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${field ? "cursor-pointer hover:text-foreground" : ""}`}
                    >
                      <span className="flex items-center gap-1">{h}{field && <SortIcon field={field as any} />}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading && browserTransactions.length === 0 ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                    No transactions found. Use the Simulator to generate data.
                  </td>
                </tr>
              ) : transactions.map(tx => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedId(tx.id)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.id}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTxType(tx.type)}</td>
                  <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">{formatNGN(tx.amount)}</td>
                  <td className="px-4 py-3 text-xs">{tx.senderLocation}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.senderPhone}</td>
                  <td className="px-4 py-3 text-xs">{tx.accountAge}d</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${getRiskBg(tx.riskScore)}`}>
                      {tx.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${getFraudLabelBg(tx.fraudLabel)}`}>
                      {tx.fraudLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <TransactionDetail
          id={selectedId}
          localTx={browserTransactions.find(tx => tx.id === selectedId)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
