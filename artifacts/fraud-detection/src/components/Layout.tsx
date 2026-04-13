import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, ShieldAlert, FileText, Settings, Database,
  BrainCircuit, BarChart3, Fingerprint, BookOpen, Download, Menu, X
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Activity },
  { name: "Simulator", href: "/simulator", icon: Database },
  { name: "Transactions", href: "/transactions", icon: FileText },
  { name: "Features", href: "/features", icon: Fingerprint },
  { name: "Explainability", href: "/explainability", icon: BrainCircuit },
  { name: "Metrics", href: "/metrics", icon: BarChart3 },
  { name: "Admin Panel", href: "/admin", icon: Settings },
  { name: "Dataset", href: "/dataset", icon: Download },
  { name: "Research Summary", href: "/research", icon: BookOpen },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPage = navigation.find((n) => n.href === location)?.name ?? "FraudShield";

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navigation.map((item) => {
        const active = location === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[hsl(222,47%,11%)] border-r border-white/10">
        <div className="flex items-center gap-2 px-6 py-6 border-b border-white/10">
          <ShieldAlert className="h-6 w-6 text-white" />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight text-white">FraudShield</span>
            <span className="text-xs text-white/50">ANU Research Prototype</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <NavLinks />
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-72 flex flex-col bg-[hsl(222,47%,11%)] shadow-xl">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-white" />
                <div className="flex flex-col">
                  <span className="font-bold text-base leading-tight text-white">FraudShield</span>
                  <span className="text-xs text-white/50">ANU Research Prototype</span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[hsl(222,47%,11%)] border-b border-white/10 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-white" />
            <span className="font-semibold text-white text-sm">{currentPage}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
