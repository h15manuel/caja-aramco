import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, Clock, Search, CalendarDays, Settings } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useShiftNotifications } from '@/hooks/useShiftNotifications';
import { CashboxManagerDialog } from '@/components/CashboxManagerDialog';

const tabs = [
  { path: '/', icon: LayoutDashboard, label: 'Caja' },
  { path: '/history', icon: Clock, label: 'Historial' },
  { path: '/fleet', icon: Search, label: 'Flota' },
  { path: '/shifts', icon: CalendarDays, label: 'Turnos' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, activeCashbox } = useApp();
  useShiftNotifications(state);

  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const saved = localStorage.getItem('uiZoom');
    if (saved) setZoom(parseInt(saved) / 100);
    const handler = () => {
      const saved = localStorage.getItem('uiZoom');
      if (saved) setZoom(parseInt(saved) / 100);
    };
    window.addEventListener('storage', handler);
    // Poll for same-tab changes
    const interval = setInterval(() => {
      const val = parseFloat(document.documentElement.style.getPropertyValue('--ui-zoom') || '1');
      setZoom(val);
    }, 300);
    return () => { window.removeEventListener('storage', handler); clearInterval(interval); };
  }, []);

  const onCajaPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight shrink-0">Control de Caja</h1>
          {onCajaPage && (
            <span className="text-sm font-medium text-primary truncate">· {activeCashbox.name}</span>
          )}
        </div>
        <CashboxManagerDialog />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24" style={{ zoom: zoom }}>
        <style dangerouslySetInnerHTML={{ __html: `:root { --shield-blur: 0px; }` }} />
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
          {tabs.map(tab => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate({ to: tab.path })}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-3xl transition-all ${
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-1.5 rounded-2xl transition-all ${active ? 'bg-primary text-primary-foreground' : ''}`}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
