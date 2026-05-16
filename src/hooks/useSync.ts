import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';

// ---------- types ----------------------------------------------------------

export interface SyncTotals {
  zAmount: number;
  tipsTotal: number;
  cashDrawer: number;
  depositsTotal: number;
  meta: number;
  efectivoReal: number;
  diferencia: number;
  status: 'cuadrada' | 'sobrante' | 'faltante';
}

export interface RemoteUser {
  username: string;
  isHost: boolean;
  online: boolean;
  lastSeen: string;
  totals: SyncTotals;
}

export type SyncRole = 'idle' | 'host' | 'guest';

export interface SyncConfig {
  scriptUrl: string;
  username: string;
  role: SyncRole;
  code: string;        // código del turno activo
  shiftId: string;     // id del turno
  hostUsername: string;
}

const DEFAULT_CONFIG: SyncConfig = {
  scriptUrl: '',
  username: '',
  role: 'idle',
  code: '',
  shiftId: '',
  hostUsername: '',
};

const STORAGE_KEY = 'caja-control-sync';
const PUSH_INTERVAL_MS = 8000;
const PULL_INTERVAL_MS = 8000;

// ---------- helpers --------------------------------------------------------

function loadConfig(): SyncConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<SyncConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(c: SyncConfig) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

function normUser(u: string) {
  return u.trim().toLowerCase();
}

async function callScript<T = unknown>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!url) throw new Error('URL de Apps Script no configurada');
  // Apps Script redirige POST cross-origin a googleusercontent.com.
  // Usamos x-www-form-urlencoded (request "simple" de CORS) con el payload
  // serializado como JSON. El backend lo parsea desde e.parameter.payload.
  const form = new URLSearchParams();
  form.set('payload', JSON.stringify(body));
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: form.toString(),
      redirect: 'follow',
    });
  } catch (e) {
    throw new Error(
      'No se pudo conectar con Apps Script. Verifica que la implementación esté como ' +
      '"Aplicación web" con acceso "Cualquier persona" (no "Cualquier persona con cuenta de Google").'
    );
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data: { ok?: boolean; error?: string } & Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Respuesta no-JSON de Apps Script (¿URL incorrecta o sin /exec?)');
  }
  if (!data.ok) throw new Error(String(data.error || 'error'));
  return data as T;
}

// ---------- hook -----------------------------------------------------------

export function useSync() {
  const [config, setConfig] = useState<SyncConfig>(loadConfig);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [lastError, setLastError] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const app = useApp();

  // Persist config
  useEffect(() => { saveConfig(config); }, [config]);

  const update = useCallback((patch: Partial<SyncConfig>) => {
    setConfig(c => ({ ...c, ...patch }));
  }, []);

  // ---------------------- API actions ----------------------

  const registerUser = useCallback(async (username: string) => {
    setBusy(true); setLastError('');
    try {
      const u = normUser(username);
      if (!u) throw new Error('Nombre vacío');
      await callScript(config.scriptUrl, { action: 'registerUser', username: u });
      update({ username: u });
      return true;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(false); }
  }, [config.scriptUrl, update]);

  const openShift = useCallback(async () => {
    setBusy(true); setLastError('');
    try {
      if (!config.username) throw new Error('Define tu nombre de usuario primero');
      const r = await callScript<{ code: string; shiftId: string }>(
        config.scriptUrl,
        { action: 'openShift', username: config.username },
      );
      update({ role: 'host', code: r.code, shiftId: r.shiftId, hostUsername: config.username });
      return r.code;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
      return null;
    } finally { setBusy(false); }
  }, [config.scriptUrl, config.username, update]);

  const joinShift = useCallback(async (code: string) => {
    setBusy(true); setLastError('');
    try {
      if (!config.username) throw new Error('Define tu nombre de usuario primero');
      const c = code.trim();
      if (!/^\d{6}$/.test(c)) throw new Error('El código debe tener 6 dígitos');
      const r = await callScript<{ shiftId: string; hostUsername: string }>(
        config.scriptUrl,
        { action: 'joinShift', username: config.username, code: c },
      );
      update({ role: 'guest', code: c, shiftId: r.shiftId, hostUsername: r.hostUsername });
      return true;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(false); }
  }, [config.scriptUrl, config.username, update]);

  const leaveShift = useCallback(async () => {
    setBusy(true); setLastError('');
    try {
      if (config.code && config.username) {
        await callScript(config.scriptUrl, {
          action: 'leaveShift',
          username: config.username,
          code: config.code,
        }).catch(() => undefined);
      }
      update({ role: 'idle', code: '', shiftId: '', hostUsername: '' });
      setRemoteUsers([]);
      return true;
    } finally { setBusy(false); }
  }, [config.scriptUrl, config.code, config.username, update]);

  // ---------------------- push / pull loop ----------------------

  // Construir totales locales actuales
  const localTotals = useMemo<SyncTotals>(() => ({
    zAmount: app.state.zAmount ?? 0,
    tipsTotal: app.state.tipsTotal ?? 0,
    cashDrawer: app.state.cashDrawer ?? 0,
    depositsTotal: app.depositsTotal,
    meta: app.meta,
    efectivoReal: app.efectivoReal,
    diferencia: app.diferencia,
    status: app.status,
  }), [
    app.state.zAmount, app.state.tipsTotal, app.state.cashDrawer,
    app.depositsTotal, app.meta, app.efectivoReal, app.diferencia, app.status,
  ]);

  const totalsRef = useRef(localTotals);
  useEffect(() => { totalsRef.current = localTotals; }, [localTotals]);

  // PUSH: enviar mis totales periódicamente cuando estoy en sesión
  useEffect(() => {
    if (config.role === 'idle' || !config.scriptUrl || !config.code) return;

    let cancelled = false;
    const send = async () => {
      try {
        await callScript(config.scriptUrl, {
          action: 'pushTotals',
          username: config.username,
          code: config.code,
          totals: totalsRef.current,
        });
        if (!cancelled) setLastError('');
      } catch (e) {
        if (!cancelled) setLastError(e instanceof Error ? e.message : String(e));
      }
    };
    void send();
    const id = window.setInterval(send, PUSH_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [config.role, config.scriptUrl, config.code, config.username]);

  // Push inmediato cuando los totales cambian (debounce simple)
  const pushDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (config.role === 'idle' || !config.scriptUrl || !config.code) return;
    if (pushDebounceRef.current) window.clearTimeout(pushDebounceRef.current);
    pushDebounceRef.current = window.setTimeout(() => {
      callScript(config.scriptUrl, {
        action: 'pushTotals',
        username: config.username,
        code: config.code,
        totals: totalsRef.current,
      }).catch(() => undefined);
    }, 1200);
    return () => {
      if (pushDebounceRef.current) window.clearTimeout(pushDebounceRef.current);
    };
  }, [localTotals, config.role, config.scriptUrl, config.code, config.username]);

  // PULL: traer la lista de usuarios remotos
  useEffect(() => {
    if (config.role === 'idle' || !config.scriptUrl || !config.code) {
      setRemoteUsers([]);
      return;
    }
    let cancelled = false;
    const pull = async () => {
      try {
        const r = await callScript<{ users: RemoteUser[] }>(config.scriptUrl, {
          action: 'pullTotals',
          code: config.code,
          username: config.username,
        });
        if (!cancelled) setRemoteUsers(r.users || []);
      } catch (e) {
        if (!cancelled) setLastError(e instanceof Error ? e.message : String(e));
      }
    };
    void pull();
    const id = window.setInterval(pull, PULL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [config.role, config.scriptUrl, config.code, config.username]);

  return {
    config,
    update,
    registerUser,
    openShift,
    joinShift,
    leaveShift,
    remoteUsers,
    lastError,
    busy,
  };
}
