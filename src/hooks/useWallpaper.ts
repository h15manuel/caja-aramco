import { useEffect, useState, useCallback } from 'react';

export type ThemePreset = {
  id: string;
  name: string;
  isDark: boolean;
  // HSL strings (e.g. "172 70% 44%")
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
};

export const themePresets: ThemePreset[] = [
  {
    id: 'dark',
    name: 'Oscuro',
    isDark: true,
    background: '220 20% 7%',
    foreground: '210 20% 92%',
    card: '220 16% 11%',
    cardForeground: '210 20% 92%',
    muted: '220 12% 18%',
    mutedForeground: '215 12% 55%',
    border: '220 12% 18%',
    primary: '172 70% 44%',
    primaryForeground: '172 70% 6%',
  },
  {
    id: 'light',
    name: 'Claro',
    isDark: false,
    background: '210 20% 97%',
    foreground: '220 20% 10%',
    card: '0 0% 100%',
    cardForeground: '220 20% 10%',
    muted: '210 12% 92%',
    mutedForeground: '215 12% 45%',
    border: '214 20% 88%',
    primary: '172 70% 38%',
    primaryForeground: '0 0% 100%',
  },
  {
    id: 'ocean',
    name: 'Océano',
    isDark: true,
    background: '210 50% 8%',
    foreground: '200 30% 95%',
    card: '210 45% 13%',
    cardForeground: '200 30% 95%',
    muted: '210 30% 20%',
    mutedForeground: '200 20% 70%',
    border: '210 30% 22%',
    primary: '195 85% 55%',
    primaryForeground: '210 80% 8%',
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    isDark: true,
    background: '20 30% 9%',
    foreground: '30 40% 95%',
    card: '20 30% 14%',
    cardForeground: '30 40% 95%',
    muted: '20 20% 22%',
    mutedForeground: '25 20% 70%',
    border: '20 20% 24%',
    primary: '20 90% 60%',
    primaryForeground: '20 80% 8%',
  },
  {
    id: 'forest',
    name: 'Bosque',
    isDark: true,
    background: '140 25% 8%',
    foreground: '90 25% 92%',
    card: '140 22% 13%',
    cardForeground: '90 25% 92%',
    muted: '140 15% 20%',
    mutedForeground: '120 12% 65%',
    border: '140 15% 22%',
    primary: '140 60% 50%',
    primaryForeground: '140 80% 6%',
  },
  {
    id: 'lavender',
    name: 'Lavanda',
    isDark: false,
    background: '270 40% 96%',
    foreground: '270 30% 15%',
    card: '0 0% 100%',
    cardForeground: '270 30% 15%',
    muted: '270 20% 90%',
    mutedForeground: '270 15% 45%',
    border: '270 20% 85%',
    primary: '270 65% 55%',
    primaryForeground: '0 0% 100%',
  },
  {
    id: 'rose',
    name: 'Rosa',
    isDark: false,
    background: '340 40% 97%',
    foreground: '340 30% 15%',
    card: '0 0% 100%',
    cardForeground: '340 30% 15%',
    muted: '340 20% 92%',
    mutedForeground: '340 15% 45%',
    border: '340 20% 85%',
    primary: '340 75% 55%',
    primaryForeground: '0 0% 100%',
  },
];

export type WallpaperConfig = {
  themeId: string;
  imageData: string | null; // dataURL
  imageOpacity: number; // 0-100 (visibilidad de la imagen)
  imageBlur: number; // 0-20 px
  surfaceAlpha: number; // 0-100 alpha de tarjetas (mayor = más opaco)
};

const STORAGE_KEY = 'wallpaperConfig';

export const defaultWallpaper: WallpaperConfig = {
  themeId: 'dark',
  imageData: null,
  imageOpacity: 35,
  imageBlur: 0,
  surfaceAlpha: 85,
};

export function applyTheme(cfg: WallpaperConfig) {
  if (typeof document === 'undefined') return;
  const preset = themePresets.find(p => p.id === cfg.themeId) ?? themePresets[0];
  const root = document.documentElement;

  if (preset.isDark) root.classList.remove('light');
  else root.classList.add('light');

  const set = (name: string, val: string) => root.style.setProperty(name, val);
  set('--background', preset.background);
  set('--foreground', preset.foreground);
  set('--card', preset.card);
  set('--card-foreground', preset.cardForeground);
  set('--popover', preset.card);
  set('--popover-foreground', preset.cardForeground);
  set('--muted', preset.muted);
  set('--muted-foreground', preset.mutedForeground);
  set('--accent', preset.muted);
  set('--accent-foreground', preset.cardForeground);
  set('--secondary', preset.muted);
  set('--secondary-foreground', preset.cardForeground);
  set('--border', preset.border);
  set('--input', preset.muted);

  // surface translucency for cards (used by .m3-surface variants)
  const alpha = Math.max(0, Math.min(100, cfg.surfaceAlpha)) / 100;
  set('--surface-alpha', alpha.toString());
  set('--bg-image-opacity', (Math.max(0, Math.min(100, cfg.imageOpacity)) / 100).toString());
  set('--bg-image-blur', `${Math.max(0, Math.min(40, cfg.imageBlur))}px`);
  set('--bg-image-url', cfg.imageData ? `url("${cfg.imageData}")` : 'none');
}

export function loadWallpaper(): WallpaperConfig {
  if (typeof localStorage === 'undefined') return defaultWallpaper;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWallpaper;
    return { ...defaultWallpaper, ...JSON.parse(raw) };
  } catch {
    return defaultWallpaper;
  }
}

export function useWallpaper() {
  const [config, setConfig] = useState<WallpaperConfig>(defaultWallpaper);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const cfg = loadWallpaper();
    setConfig(cfg);
    applyTheme(cfg);
    setHydrated(true);
    const onChange = () => {
      const next = loadWallpaper();
      setConfig(next);
      applyTheme(next);
    };
    window.addEventListener('wallpaperChange', onChange);
    return () => window.removeEventListener('wallpaperChange', onChange);
  }, []);

  const update = useCallback((patch: Partial<WallpaperConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota or private mode */
      }
      applyTheme(next);
      window.dispatchEvent(new Event('wallpaperChange'));
      return next;
    });
  }, []);

  return { config, update, hydrated };
}
