import { useState } from "react";
import { useGenerateTransactions, useResetSimulator } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetDashboardStatsQueryKey, getListTransactionsQueryKey, getGetFraudAlertsQueryKey } from "@workspace/api-client-react";
import { formatNGN, formatTxType, getRiskBg, getFraudLabelBg } from "@/lib/utils";
import { clearBrowserTransactions, saveBrowserTransactions } from "@/lib/browserTransactions";
import { AlertTriangle, Database, Info, RefreshCw, Trash2, Play } from "lucide-react";

const NIGERIAN_CITIES = [
  "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City",
  "Maiduguri", "Zaria", "Jos", "Enugu", "Abeokuta", "Onitsha",
  "Warri", "Sokoto", "Ilorin", "Aba", "Asaba", "Calabar",
];

const TX_TYPES = ["send", "receive", "withdraw", "agent_deposit", "agent_withdrawal", "airtime", "bill_payment"];
const HIGH_RISK_CITIES = ["Maiduguri", "Sokoto", "Zaria"];
const PHONE_PREFIXES = ["0803", "0806", "0810", "0813", "0814", "0816", "0903", "0906", "0805", "0807", "0811", "0815", "0905", "0802", "0808", "0812", "0701", "0708", "0902", "0809", "0818", "0819", "0909"];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function generatePhone() {
  return `${randomChoice(PHONE_PREFIXES)}${randomInt(1000000, 9999999)}`;
}

function analyzeLocalFraud(tx: any) {
  const triggeredRules: string[] = [];
  let riskScore = 6;

  if (tx.amount > 200000) {
    riskScore += 24;
    triggeredRules.push("Large amount transaction");
  }
  if (tx.amount > 500000) {
    riskScore += 18;
    triggeredRules.push("Very high value transfer");
  }
  if (HIGH_RISK_CITIES.includes(tx.senderLocation)) {
    riskScore += 22;
    triggeredRules.push("High-risk geolocation detected");
  }
  if (tx.accountAge < 30) {
    riskScore += tx.accountAge < 7 ? 28 : 16;
    triggeredRules.push(tx.accountAge < 7 ? "New account under 7 days" : "Recently created account");
  }
  if (tx.previousTxCount > 30) {
    riskScore += tx.previousTxCount > 50 ? 18 : 12;
    triggeredRules.push("High transaction velocity");
  }
  if (tx.isNewDevice) {
    riskScore += 18;
    triggeredRules.push("New or unrecognized device");
  }
  if (tx.hourOfDay < 5) {
    riskScore += 14;
    triggeredRules.push("Unusual late-night transaction time");
  }
  if (["agent_deposit", "agent_withdrawal"].includes(tx.type) && tx.amount > 50000) {
    riskScore += 10;
    triggeredRules.push("Large agent transaction");
  }

  riskScore = Math.min(100, riskScore);
  const fraudLabel = riskScore >= 70 ? "fraudulent" : riskScore >= 40 ? "suspicious" : "clean";
  const featureImportance = [
    { feature: "Transaction Amount", value: tx.amount, importance: Math.min(0.95, tx.amount / 600000), direction: tx.amount > 50000 ? "increases_risk" : "neutral", description: `${formatNGN(tx.amount)} transaction amount` },
    { feature: "Account Age", value: tx.accountAge, importance: tx.accountAge < 30 ? 0.75 : 0.12, direction: tx.accountAge < 30 ? "increases_risk" : "decreases_risk", description: `Account is ${tx.accountAge} days old` },
    { feature: "Device Recognition", value: tx.isNewDevice ? 1 : 0, importance: tx.isNewDevice ? 0.7 : 0.08, direction: tx.isNewDevice ? "increases_risk" : "decreases_risk", description: tx.isNewDevice ? "New device fingerprint" : "Known device fingerprint" },
    { feature: "Location", value: tx.senderLocation, importance: HIGH_RISK_CITIES.includes(tx.senderLocation) ? 0.7 : 0.1, direction: HIGH_RISK_CITIES.includes(tx.senderLocation) ? "increases_risk" : "neutral", description: `${tx.senderLocation} transaction origin` },
  ].sort((a, b) => b.importance - a.importance);

  return {
    riskScore,
    isFraud: fraudLabel === "fraudulent",
    fraudLabel,
    triggeredRules,
    featureImportance,
    explanation: fraudLabel === "clean"
      ? `Transaction appears legitimate with a ${riskScore}/100 risk score.`
      : `Transaction is ${fraudLabel} with a ${riskScore}/100 risk score. Key signals: ${triggeredRules.slice(0, 3).join(", ") || "mixed behavioral indicators"}.`,
    modelUsed: "Browser Simulator",
    confidence: Math.min(0.99, 0.5 + Math.abs(riskScore - 50) / 100),
  };
}

function generateLocalBatch(config: any) {
  const types: string[] = config.transactionTypes.length
    ? config.transactionTypes
    : config.includeAgentTransactions
    ? TX_TYPES
    : TX_TYPES.filter(type => !type.startsWith("agent_"));
  const fraudCount = Math.round(config.count * config.fraudRate);
  const transactions = Array.from({ length: config.count }, (_, index) => {
    const fraudTarget = index < fraudCount;
    const type = randomChoice(types);
    const min = Math.min(config.amountMin, config.amountMax);
    const max = Math.max(config.amountMin, config.amountMax);
    const cleanMax = Math.max(min, Math.min(max, 100000));
    const fraudMin = Math.min(max, Math.max(min, Math.floor(min + (max - min) * 0.55)));
    const amount = fraudTarget ? randomInt(fraudMin, max) : randomInt(min, cleanMax);
    const hourOfDay = fraudTarget && Math.random() < 0.45 ? randomInt(0, 4) : randomInt(7, 22);
    const senderLocation = fraudTarget && Math.random() < 0.35 ? randomChoice(HIGH_RISK_CITIES) : config.location;
    const createdAt = new Date().toISOString();
    const tx = {
      id: `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      type,
      amount,
      currency: "NGN",
      senderPhone: generatePhone(),
      recipientPhone: ["send", "receive", "airtime"].includes(type) ? generatePhone() : null,
      senderLocation,
      deviceId: `DEV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      timestamp: new Date(new Date().setHours(hourOfDay, randomInt(0, 59), 0, 0)).toISOString(),
      createdAt,
      accountAge: fraudTarget ? randomInt(1, 60) : randomInt(90, 1800),
      previousTxCount: fraudTarget ? randomInt(0, 100) : randomInt(5, 45),
      hourOfDay,
      isNewDevice: fraudTarget ? Math.random() < 0.7 : Math.random() < 0.08,
    };
    const analysis = analyzeLocalFraud(tx);
    return { ...tx, ...analysis, fraudAnalysis: analysis };
  }).sort(() => Math.random() - 0.5);

  const fraudulent = transactions.filter(t => t.fraudLabel === "fraudulent").length;
  const flagged = transactions.filter(t => t.fraudLabel !== "clean").length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgRiskScore = transactions.reduce((sum, t) => sum + t.riskScore, 0) / transactions.length;

  return {
    transactions,
    summary: {
      total: transactions.length,
      flagged,
      fraudulent,
      avgRiskScore: Math.round(avgRiskScore),
      totalAmount: Math.round(totalAmount),
    },
  };
}

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
  const [runMode, setRunMode] = useState<"api" | "browser" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const buildPayload = () => ({
    count: Math.min(Math.max(config.count || 1, 1), 100),
    fraudRate: Math.min(Math.max(config.fraudRate, 0), 1),
    location: config.location,
    amountRange: {
      min: Math.min(config.amountMin, config.amountMax),
      max: Math.max(config.amountMin, config.amountMax),
    },
    includeAgentTransactions: config.includeAgentTransactions,
    transactionTypes: config.transactionTypes,
  });

  const handleGenerate = () => {
    setNotice(null);
    const payload = buildPayload();

    generateMutation.mutate({ data: payload } as any, {
      onSuccess: (data) => {
        setResult(data);
        setRunMode("api");
        if ((data as any)?.persisted === false) {
          saveBrowserTransactions((data as any).transactions ?? []);
          setNotice("This batch was generated by the API and saved in this browser while the database connection catches up.");
        }
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFraudAlertsQueryKey() });
      },
      onError: (error) => {
        const localResult = generateLocalBatch(config);
        saveBrowserTransactions(localResult.transactions);
        setResult(localResult);
        setRunMode("browser");
        setNotice("This batch was generated in your browser and saved locally for the dashboard, transactions, explainability, metrics, and dataset pages.");
      },
    });
  };

  const handleReset = () => {
    if (!confirm("Reset all transaction data? This cannot be undone.")) return;
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        setResult(null);
        setRunMode(null);
        setNotice(null);
        clearBrowserTransactions();
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFraudAlertsQueryKey() });
      },
      onError: () => {
        setResult(null);
        setRunMode(null);
        clearBrowserTransactions();
        setNotice("Browser results cleared. The API reset request did not complete.");
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

      {notice && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Simulation data is ready.</p>
            <p className="text-xs mt-1 text-amber-700">{notice}</p>
          </div>
        </div>
      )}

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
                  {runMode && (
                    <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                      <Info className="h-3 w-3" />
                      {runMode === "api" ? "API backed" : "Browser generated"}
                    </span>
                  )}
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
