import { useEffect, useState } from "react";
import { useGetDashboardStats, useListTransactions, useGetFraudAlerts } from "@workspace/api-client-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatNGN, formatTxType, getRiskBg, getFraudLabelBg, getSeverityBg, formatRelativeTime } from "@/lib/utils";
import { BROWSER_TRANSACTIONS_CHANGED, getBrowserTransactions, type BrowserTransaction } from "@/lib/browserTransactions";
import { buildBrowserAlerts, computeBrowserStats, mergeDashboardStats } from "@/lib/browserAnalytics";
import { ShieldAlert, TrendingUp, AlertTriangle, DollarSign, Activity } from "lucide-react";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function Dashboard() {
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

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: ({ refetchInterval: 10000 } as unknown) as any,
  });
  const { data: txData, isLoading: txLoading } = useListTransactions(
    { limit: 15 },
    ({ query: { refetchInterval: 5000 } } as unknown) as any
  );
  const { data: alertData, isLoading: alertLoading } = useGetFraudAlerts(
    { limit: 10 },
    ({ query: { refetchInterval: 5000 } } as unknown) as any
  );

  const hasBrowserTransactions = browserTransactions.length > 0;
  const browserStats = computeBrowserStats(browserTransactions);
  const effectiveStats = mergeDashboardStats(stats as any, browserStats);
  const apiTransactions = txData?.transactions ?? [];
  const apiIds = new Set(apiTransactions.map(tx => tx.id));
  const effectiveTransactions = [
    ...apiTransactions,
    ...browserTransactions.filter(tx => !apiIds.has(tx.id)),
  ]
    .sort((a, b) => new Date(b.createdAt ?? b.timestamp).getTime() - new Date(a.createdAt ?? a.timestamp).getTime())
    .slice(0, 15);
  const browserAlerts = buildBrowserAlerts(browserTransactions);
  const effectiveAlerts = [
    ...(alertData?.alerts ?? []),
    ...browserAlerts.filter(alert => !(alertData?.alerts ?? []).some(apiAlert => apiAlert.id === alert.id)),
  ].slice(0, 10);

  if (statsLoading && !hasBrowserTransactions) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Transactions",
      value: effectiveStats.totalTransactions.toLocaleString(),
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Fraud Rate",
      value: `${(effectiveStats.fraudRate * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Flagged Transactions",
      value: effectiveStats.flaggedTransactions.toLocaleString(),
      icon: ShieldAlert,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Total Volume",
      value: formatNGN(effectiveStats.totalAmount),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  const txTypeData = effectiveStats.byType.map(t => ({
    name: formatTxType(t.type),
    total: t.count,
    fraud: t.fraudCount,
  }));

  const locationData = effectiveStats.byLocation.slice(0, 6).map(l => ({
    name: l.location,
    value: l.count,
    fraud: l.fraudCount,
  }));

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Live Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time mobile money fraud detection — refreshing every 5 seconds</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border border-card-border rounded-lg p-5 flex items-start gap-4">
            <div className={`${card.bg} p-2.5 rounded-lg`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Volume by Type */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-lg p-5">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">Transactions by Type</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={txTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fraud" name="Fraudulent" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Location Distribution */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">By Location</h2>
          {locationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={locationData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" label={({ name }) => name} labelLine={false}>
                  {locationData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, "Transactions"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet — run the simulator</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Transaction Feed */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Live Transaction Feed</h2>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          {txLoading && !hasBrowserTransactions ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
          ) : effectiveTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No transactions yet. Use the Simulator to generate data.</div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {effectiveTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 group">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">{tx.id}</span>
                    <span className="text-xs text-muted-foreground">{formatTxType(tx.type)} · {tx.senderPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium">{formatNGN(tx.amount)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getRiskBg(tx.riskScore)}`}>
                      {tx.riskScore}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getFraudLabelBg(tx.fraudLabel)}`}>
                      {tx.fraudLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fraud Alerts */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Fraud Alerts</h2>
            <span className="flex items-center gap-1.5 text-xs text-red-600">
              <ShieldAlert className="h-3.5 w-3.5" />
              {effectiveAlerts.length} active
            </span>
          </div>
          {alertLoading && !hasBrowserTransactions ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
          ) : effectiveAlerts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No fraud alerts. System is clean.</div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {effectiveAlerts.map(alert => (
                <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityBg(alert.severity)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide">{alert.severity}</span>
                    <span className="text-xs font-mono">{formatRelativeTime(alert.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs">{alert.senderPhone} · {formatTxType(alert.type)}</span>
                    <span className="text-xs font-semibold">{formatNGN(alert.amount)}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80 line-clamp-1">{alert.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Risk Score</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{effectiveStats.avgRiskScore}</p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Fraudulent</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{effectiveStats.fraudulentTransactions}</p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Recent Alerts</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{effectiveStats.recentAlerts}</p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Blocked Amount</p>
          <p className="text-lg font-bold mt-1 text-red-600">{formatNGN(effectiveStats.blockedAmount)}</p>
        </div>
      </div>
    </div>
  );
}
