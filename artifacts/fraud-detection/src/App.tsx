import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { setBaseUrl } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Simulator from "@/pages/Simulator";
import Transactions from "@/pages/Transactions";
import Features from "@/pages/Features";
import Explainability from "@/pages/Explainability";
import Metrics from "@/pages/Metrics";
import Admin from "@/pages/Admin";
import Research from "@/pages/Research";
import Dataset from "@/pages/Dataset";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/simulator" component={Simulator} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/features" component={Features} />
        <Route path="/explainability" component={Explainability} />
        <Route path="/metrics" component={Metrics} />
        <Route path="/admin" component={Admin} />
        <Route path="/research" component={Research} />
        <Route path="/dataset" component={Dataset} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    // Allow overriding API base at build/runtime via Vite env var.
    // If not set, the client will use relative paths (good for same-origin APIs).
    const apiUrl = (import.meta.env as any).VITE_API_URL ?? null;
    setBaseUrl(apiUrl);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
