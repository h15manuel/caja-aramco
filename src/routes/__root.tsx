import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import Layout from "@/components/Layout";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Cajita — Control de Caja" },
      { name: "description", content: "Control de caja, turnos y flota" },
      { name: "theme-color", content: "#000000", id: "theme-color-meta" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">Página no encontrada</p>
        <a href="/" className="mt-6 inline-block rounded-2xl bg-primary px-4 py-2 text-primary-foreground">
          Ir al inicio
        </a>
      </div>
    </div>
  );
}

const WALLPAPER_BOOT_SCRIPT = `
(function(){
  try {
    var raw = localStorage.getItem('wallpaperConfig');
    if (!raw) return;
    var cfg = JSON.parse(raw);
    var root = document.documentElement;
    var presets = {
      dark:     {bg:'220 20% 7%',fg:'210 20% 92%',card:'220 16% 11%',cardFg:'210 20% 92%',muted:'220 12% 18%',mutedFg:'215 12% 55%',border:'220 12% 18%',primary:'172 70% 44%',primaryFg:'172 70% 6%',isDark:true},
      light:    {bg:'210 20% 97%',fg:'220 20% 10%',card:'0 0% 100%',cardFg:'220 20% 10%',muted:'210 12% 92%',mutedFg:'215 12% 45%',border:'214 20% 88%',primary:'172 70% 38%',primaryFg:'0 0% 100%',isDark:false},
      ocean:    {bg:'210 50% 8%',fg:'200 30% 95%',card:'210 45% 13%',cardFg:'200 30% 95%',muted:'210 30% 20%',mutedFg:'200 20% 70%',border:'210 30% 22%',primary:'195 85% 55%',primaryFg:'210 80% 8%',isDark:true},
      sunset:   {bg:'20 30% 9%',fg:'30 40% 95%',card:'20 30% 14%',cardFg:'30 40% 95%',muted:'20 20% 22%',mutedFg:'25 20% 70%',border:'20 20% 24%',primary:'20 90% 60%',primaryFg:'20 80% 8%',isDark:true},
      forest:   {bg:'140 25% 8%',fg:'90 25% 92%',card:'140 22% 13%',cardFg:'90 25% 92%',muted:'140 15% 20%',mutedFg:'120 12% 65%',border:'140 15% 22%',primary:'140 60% 50%',primaryFg:'140 80% 6%',isDark:true},
      lavender: {bg:'270 40% 96%',fg:'270 30% 15%',card:'0 0% 100%',cardFg:'270 30% 15%',muted:'270 20% 90%',mutedFg:'270 15% 45%',border:'270 20% 85%',primary:'270 65% 55%',primaryFg:'0 0% 100%',isDark:false},
      rose:     {bg:'340 40% 97%',fg:'340 30% 15%',card:'0 0% 100%',cardFg:'340 30% 15%',muted:'340 20% 92%',mutedFg:'340 15% 45%',border:'340 20% 85%',primary:'340 75% 55%',primaryFg:'0 0% 100%',isDark:false}
    };
    var p = presets[cfg.themeId] || presets.dark;
    if (p.isDark) root.classList.remove('light'); else root.classList.add('light');
    var s = function(n,v){ root.style.setProperty(n,v); };
    s('--background',p.bg); s('--foreground',p.fg);
    s('--card',p.card); s('--card-foreground',p.cardFg);
    s('--popover',p.card); s('--popover-foreground',p.cardFg);
    s('--muted',p.muted); s('--muted-foreground',p.mutedFg);
    s('--accent',p.muted); s('--accent-foreground',p.cardFg);
    s('--secondary',p.muted); s('--secondary-foreground',p.cardFg);
    s('--border',p.border); s('--input',p.muted);
    var alpha = Math.max(0,Math.min(100, cfg.surfaceAlpha != null ? cfg.surfaceAlpha : 85))/100;
    s('--surface-alpha', String(alpha));
    s('--bg-image-opacity', String(Math.max(0,Math.min(100, cfg.imageOpacity != null ? cfg.imageOpacity : 35))/100));
    s('--bg-image-blur', Math.max(0,Math.min(40, cfg.imageBlur || 0)) + 'px');
    s('--bg-image-url', cfg.imageData ? 'url("'+cfg.imageData+'")' : 'none');
  } catch(e){}
})();
`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: WALLPAPER_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <AppProvider>
          <Layout>
            <Outlet />
          </Layout>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
