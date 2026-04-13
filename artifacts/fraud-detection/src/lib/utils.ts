import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNGN(amount: number): string {
  return `NGN ${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatTxType(type: string): string {
  const map: Record<string, string> = {
    send: "Send",
    receive: "Receive",
    withdraw: "Withdraw",
    agent_deposit: "Agent Deposit",
    agent_withdrawal: "Agent Withdrawal",
    airtime: "Airtime",
    bill_payment: "Bill Payment",
  };
  return map[type] || type;
}

export function getRiskBg(score: number): string {
  if (score >= 70) return "bg-red-100 text-red-700 border border-red-200";
  if (score >= 40) return "bg-amber-100 text-amber-700 border border-amber-200";
  return "bg-emerald-100 text-emerald-700 border border-emerald-200";
}

export function getFraudLabelBg(label: string): string {
  if (label === "fraudulent") return "bg-red-100 text-red-700 border border-red-200";
  if (label === "suspicious") return "bg-amber-100 text-amber-700 border border-amber-200";
  return "bg-emerald-100 text-emerald-700 border border-emerald-200";
}

export function getSeverityBg(severity: string): string {
  if (severity === "critical") return "bg-red-100 text-red-700 border border-red-200";
  if (severity === "high") return "bg-orange-100 text-orange-700 border border-orange-200";
  if (severity === "medium") return "bg-amber-100 text-amber-700 border border-amber-200";
  return "bg-yellow-50 text-yellow-700 border border-yellow-200";
}

export function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
