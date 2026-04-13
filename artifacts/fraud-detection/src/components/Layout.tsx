import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider 
} from "@/components/ui/sidebar";
import { Activity, ShieldAlert, FileText, Settings, Database, BrainCircuit, BarChart3, Fingerprint, BookOpen, Download } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

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

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="px-6 py-6 border-b">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">FraudShield</span>
                <span className="text-xs text-muted-foreground">ANU Research Prototype</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3 py-4">
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.href}
                    className="w-full justify-start py-5"
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-auto bg-muted/20">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
