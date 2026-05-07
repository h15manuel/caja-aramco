import { Outlet, createRootRoute, Link } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { SyncProvider } from "@/contexts/SyncContext";
import Layout from "@/components/Layout";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">Página no encontrada</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-2xl bg-primary px-4 py-2 text-primary-foreground"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <AppProvider>
          <SyncProvider>
            <Layout>
              <Outlet />
            </Layout>
          </SyncProvider>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
