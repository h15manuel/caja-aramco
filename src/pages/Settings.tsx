import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Palette, Moon, Sun, Check, Download, Upload, Bell, ZoomIn } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { AppState, defaultAppState } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const presetColors = ['#1abc9c', '#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#2ecc71', '#e91e63', '#00bcd4'];

export default function SettingsPage() {
  const { state, setState } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDark, setIsDark] = useState(() => !document.documentElement.classList.contains('light'));
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('primaryColor') || '#1abc9c');
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('uiZoom');
    return saved ? parseInt(saved) : 100;
  });

  useEffect(() => {
    localStorage.setItem('uiZoom', zoom.toString());
    document.documentElement.style.setProperty('--ui-zoom', (zoom / 100).toString());
  }, [zoom]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const applyColor = (hex: string) => {
    const hsl = hexToHSL(hex);
    if (!hsl) return;
    setPrimaryColor(hex);
    localStorage.setItem('primaryColor', hex);
    const val = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    document.documentElement.style.setProperty('--primary', val);
    document.documentElement.style.setProperty('--ring', val);
    const fgL = hsl.l > 50 ? 6 : 98;
    document.documentElement.style.setProperty('--primary-foreground', `${hsl.h} ${hsl.s}% ${fgL}%`);
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', hex);
  };

  useEffect(() => {
    const saved = localStorage.getItem('primaryColor');
    if (saved) applyColor(saved);
    const theme = localStorage.getItem('theme');
    if (theme === 'light') document.documentElement.classList.add('light');
  }, []);

  const exportBackup = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cajita-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Respaldo exportado correctamente');
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        // Validate basic structure
        if (typeof parsed !== 'object' || !Array.isArray(parsed.entries) || !Array.isArray(parsed.shiftHistory)) {
          throw new Error('Formato inválido');
        }
        const restored: AppState = { ...defaultAppState, ...parsed };
        setState(restored);
        toast.success(`Respaldo restaurado: ${restored.shiftHistory.length} turnos, ${restored.entries.length} movimientos`);
      } catch {
        toast.error('Error: el archivo no es un respaldo válido');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 pt-2 max-w-lg mx-auto">
      {/* Theme toggle */}
      <div className="m3-surface-elevated p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <div>
              <p className="text-sm font-medium text-foreground">Modo Oscuro</p>
              <p className="text-xs text-muted-foreground">{isDark ? 'Activado' : 'Desactivado'}</p>
            </div>
          </div>
          <Switch checked={isDark} onCheckedChange={setIsDark} />
        </div>
      </div>

      {/* Color picker */}
      <div className="m3-surface-elevated p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Color Primario</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {presetColors.map(color => (
            <button
              key={color}
              onClick={() => applyColor(color)}
              className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
              style={{ backgroundColor: color }}
            >
              {primaryColor === color && <Check className="w-4 h-4 text-white drop-shadow-md" />}
            </button>
          ))}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Color personalizado (hex)</Label>
          <div className="flex gap-2 mt-1">
            <div className="w-10 h-10 rounded-2xl border border-border" style={{ backgroundColor: primaryColor }} />
            <Input
              value={primaryColor}
              onChange={e => {
                const v = e.target.value;
                setPrimaryColor(v);
                if (/^#[0-9a-fA-F]{6}$/.test(v)) applyColor(v);
              }}
              placeholder="#1abc9c"
              className="rounded-2xl bg-secondary border-border font-mono"
            />
          </div>
        </div>
      </div>

      {/* Zoom */}
      <div className="m3-surface-elevated p-5 space-y-4">
        <div className="flex items-center gap-3">
          <ZoomIn className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Tamaño de Interfaz</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Zoom: {zoom}%</p>
            <button
              onClick={() => { setZoom(100); }}
              className="text-xs text-primary hover:underline"
            >
              Restablecer
            </button>
          </div>
          <Slider
            value={[zoom]}
            onValueChange={v => setZoom(v[0])}
            min={75}
            max={125}
            step={5}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>75%</span>
            <span>100%</span>
            <span>125%</span>
          </div>
        </div>
      </div>

      {/* Notificaciones de turno */}
      <div className="m3-surface-elevated p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Notificaciones de Turno</p>
        </div>
        <p className="text-xs text-muted-foreground">Recibe una notificación el día anterior recordándote tu próximo turno.</p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground">Activar notificaciones</p>
          <Switch
            checked={state.notificationsEnabled}
            onCheckedChange={async (checked) => {
              if (checked) {
                try {
                  if (!('Notification' in window)) {
                    toast.error('Tu navegador no soporta notificaciones');
                    return;
                  }
                  const permission = await Notification.requestPermission();
                  if (permission !== 'granted') {
                    toast.error('Debes permitir las notificaciones en tu navegador');
                    return;
                  }
                } catch {
                  toast.error('Error al solicitar permisos de notificación');
                  return;
                }
              }
              setState(s => ({ ...s, notificationsEnabled: checked }));
              toast.success(checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
            }}
          />
        </div>
        {state.notificationsEnabled && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hora de aviso</Label>
            <Input
              type="time"
              value={state.notificationTime}
              onChange={e => setState(s => ({ ...s, notificationTime: e.target.value }))}
              className="rounded-2xl bg-secondary border-border w-32"
            />
          </div>
        )}
      </div>

      {/* Backup */}
      <div className="m3-surface-elevated p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">Respaldo de Datos</p>
        <p className="text-xs text-muted-foreground">Exporta o importa todos tus datos (turnos, movimientos, empresas, configuración) en formato JSON.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportBackup} className="flex-1 rounded-2xl gap-2 bg-secondary/50 border-border">
            <Download className="w-4 h-4 text-primary" />
            <span className="text-foreground text-sm">Exportar</span>
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-2xl gap-2 bg-secondary/50 border-border">
            <Upload className="w-4 h-4 text-primary" />
            <span className="text-foreground text-sm">Importar</span>
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importBackup} />
        </div>
      </div>

      {/* Info */}
      <div className="m3-surface p-4">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Control de Caja</p>
            <p className="text-xs text-muted-foreground">v1.0 · PWA Material Design 3</p>
          </div>
        </div>
      </div>
    </div>
  );
}
