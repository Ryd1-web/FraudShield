const STORAGE_KEY = "fraudshield.browserTransactions";
export const BROWSER_TRANSACTIONS_CHANGED = "fraudshield:browser-transactions-changed";

export type BrowserTransaction = Record<string, any> & {
  id: string;
  createdAt: string;
};

function normalizeTransaction(tx: Record<string, any>): BrowserTransaction {
  const createdAt = String(tx.createdAt ?? tx.timestamp ?? new Date().toISOString());
  const id = String(tx.id ?? tx.transactionId ?? `${createdAt}-${Math.random().toString(36).slice(2, 8)}`);

  return {
    ...tx,
    id,
    createdAt,
    timestamp: tx.timestamp ?? createdAt,
    currency: tx.currency ?? "NGN",
  } as BrowserTransaction;
}

export function getBrowserTransactions(): BrowserTransaction[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTransaction) : [];
  } catch {
    return [];
  }
}

export function saveBrowserTransactions(transactions: Record<string, any>[]) {
  if (typeof window === "undefined") return;

  const existing = getBrowserTransactions();
  const byId = new Map(existing.map(tx => [tx.id, tx]));

  for (const tx of transactions) {
    const normalized = normalizeTransaction(tx);
    byId.set(normalized.id, normalized);
  }

  const next = Array.from(byId.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 500);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BROWSER_TRANSACTIONS_CHANGED));
}

export function clearBrowserTransactions() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(BROWSER_TRANSACTIONS_CHANGED));
}
