import { formatTxType } from "@/lib/utils";
import type { BrowserTransaction } from "@/lib/browserTransactions";

type DashboardStatsLike = {
  totalTransactions: number;
  flaggedTransactions: number;
  fraudulentTransactions: number;
  totalAmount: number;
  avgRiskScore: number;
  fraudRate: number;
  recentAlerts: number;
  blockedAmount: number;
  byType: Array<{ type: string; count: number; fraudCount: number }>;
  byLocation: Array<{ location: string; count: number; fraudCount: number }>;
};

function emptyStats(): DashboardStatsLike {
  return {
    totalTransactions: 0,
    flaggedTransactions: 0,
    fraudulentTransactions: 0,
    totalAmount: 0,
    avgRiskScore: 0,
    fraudRate: 0,
    recentAlerts: 0,
    blockedAmount: 0,
    byType: [],
    byLocation: [],
  };
}

export function computeBrowserStats(transactions: BrowserTransaction[]): DashboardStatsLike {
  if (transactions.length === 0) return emptyStats();

  const flagged = transactions.filter(tx => tx.fraudLabel !== "clean");
  const fraudulent = transactions.filter(tx => tx.fraudLabel === "fraudulent");
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const byType = new Map<string, { type: string; count: number; fraudCount: number }>();
  const byLocation = new Map<string, { location: string; count: number; fraudCount: number }>();

  for (const tx of transactions) {
    const typeRow = byType.get(tx.type) ?? { type: tx.type, count: 0, fraudCount: 0 };
    typeRow.count++;
    if (tx.fraudLabel === "fraudulent") typeRow.fraudCount++;
    byType.set(tx.type, typeRow);

    const locationRow = byLocation.get(tx.senderLocation) ?? { location: tx.senderLocation, count: 0, fraudCount: 0 };
    locationRow.count++;
    if (tx.fraudLabel === "fraudulent") locationRow.fraudCount++;
    byLocation.set(tx.senderLocation, locationRow);
  }

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const riskTotal = transactions.reduce((sum, tx) => sum + tx.riskScore, 0);
  const blockedAmount = fraudulent.reduce((sum, tx) => sum + tx.amount, 0);

  return {
    totalTransactions: transactions.length,
    flaggedTransactions: flagged.length,
    fraudulentTransactions: fraudulent.length,
    totalAmount: Math.round(totalAmount),
    avgRiskScore: Math.round(riskTotal / transactions.length),
    fraudRate: fraudulent.length / transactions.length,
    recentAlerts: flagged.filter(tx => new Date(tx.createdAt).getTime() > oneHourAgo).length,
    blockedAmount: Math.round(blockedAmount),
    byType: Array.from(byType.values()).sort((a, b) => b.count - a.count),
    byLocation: Array.from(byLocation.values()).sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

export function mergeDashboardStats(apiStats: Partial<DashboardStatsLike> | undefined, browserStats: DashboardStatsLike): DashboardStatsLike {
  if (!apiStats || Object.keys(apiStats).length === 0) return browserStats;
  if (browserStats.totalTransactions === 0) return { ...emptyStats(), ...apiStats };

  const apiTotal = apiStats.totalTransactions ?? 0;
  const totalTransactions = apiTotal + browserStats.totalTransactions;
  const totalAmount = (apiStats.totalAmount ?? 0) + browserStats.totalAmount;
  const fraudulentTransactions = (apiStats.fraudulentTransactions ?? 0) + browserStats.fraudulentTransactions;
  const flaggedTransactions = (apiStats.flaggedTransactions ?? 0) + browserStats.flaggedTransactions;

  const byType = new Map<string, { type: string; count: number; fraudCount: number }>();
  for (const row of [...(apiStats.byType ?? []), ...browserStats.byType]) {
    const current = byType.get(row.type) ?? { type: row.type, count: 0, fraudCount: 0 };
    current.count += row.count;
    current.fraudCount += row.fraudCount;
    byType.set(row.type, current);
  }

  const byLocation = new Map<string, { location: string; count: number; fraudCount: number }>();
  for (const row of [...(apiStats.byLocation ?? []), ...browserStats.byLocation]) {
    const current = byLocation.get(row.location) ?? { location: row.location, count: 0, fraudCount: 0 };
    current.count += row.count;
    current.fraudCount += row.fraudCount;
    byLocation.set(row.location, current);
  }

  return {
    totalTransactions,
    flaggedTransactions,
    fraudulentTransactions,
    totalAmount,
    avgRiskScore: totalTransactions > 0
      ? Math.round(((apiStats.avgRiskScore ?? 0) * apiTotal + browserStats.avgRiskScore * browserStats.totalTransactions) / totalTransactions)
      : 0,
    fraudRate: totalTransactions > 0 ? fraudulentTransactions / totalTransactions : 0,
    recentAlerts: (apiStats.recentAlerts ?? 0) + browserStats.recentAlerts,
    blockedAmount: (apiStats.blockedAmount ?? 0) + browserStats.blockedAmount,
    byType: Array.from(byType.values()).sort((a, b) => b.count - a.count),
    byLocation: Array.from(byLocation.values()).sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

export function buildBrowserAlerts(transactions: BrowserTransaction[]) {
  return transactions
    .filter(tx => tx.fraudLabel !== "clean")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map(tx => ({
      id: tx.id,
      severity: tx.riskScore >= 85 ? "critical" : tx.riskScore >= 70 ? "high" : "medium",
      timestamp: tx.createdAt,
      senderPhone: tx.senderPhone,
      type: tx.type,
      amount: tx.amount,
      explanation: tx.fraudAnalysis?.explanation ?? `${formatTxType(tx.type)} transaction flagged with risk score ${tx.riskScore}.`,
    }));
}

export function exportBrowserCsv(transactions: BrowserTransaction[]) {
  const headers = [
    "id", "type", "amount", "currency", "senderPhone", "recipientPhone",
    "senderLocation", "deviceId", "timestamp", "accountAge", "previousTxCount",
    "riskScore", "isFraud", "fraudLabel", "createdAt",
  ];
  const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = transactions.map(tx => headers.map(header => escapeCsv(tx[header])).join(","));
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fraud_detection_browser_dataset.csv";
  a.click();
  URL.revokeObjectURL(url);
}
