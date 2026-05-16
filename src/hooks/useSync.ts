import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ---------- types ----------------------------------------------------------

export interface SyncTotals {
  zAmount: number;
  tipsTotal: number;
  cashDrawer: number;
  depositsTotal: number;
  cashCreditTotal: number;
  couponTotal: number;
  totalDinero: number;
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
  username: string;
  role: SyncRole;
  code: string;
  shiftId: string;
  hostUsername: string;
  // legacy fields kept so old localStorage doesn't break
  scriptUrl?: string;
}

const DEFAULT_CONFIG: SyncConfig = {
  username: '',
  role: 'idle',
  code: '',
  shiftId: '',
  hostUsername: '',
};

const STORAGE_KEY = 'caja-control-sync';
const PUSH_INTERVAL_MS = 10000;
const ONLINE_WINDOW_MS = 30000;

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

function genCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const EMPTY_TOTALS: SyncTotals = {
  zAmount: 0, tipsTotal: 0, cashDrawer: 0, depositsTotal: 0,
  cashCreditTotal: 0, couponTotal: 0, totalDinero: 0,
  meta: 0, efectivoReal: 0, diferencia: 0, status: 'cuadrada',
};

// ---------- hook -----------------------------------------------------------

export function useSync() {
  const [config, setConfig] = useState<SyncConfig>(loadConfig);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [lastError, setLastError] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const app = useApp();

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
      update({ username: u });
      return true;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(false); }
  }, [update]);

  const openShift = useCallback(async () => {
    setBusy(true); setLastError('');
    try {
      if (!config.username) throw new Error('Define tu nombre de usuario primero');
      // Try a few codes in case of (very unlikely) collision
      let code = '';
      let shiftId = '';
      for (let i = 0; i < 5; i++) {
        const candidate = genCode();
        const { data, error } = await supabase
          .from('shifts')
          .insert({ code: candidate, host_username: config.username })
          .select('code, shift_id')
          .single();
        if (!error && data) { code = data.code; shiftId = data.shift_id; break; }
        if (error && !String(error.message).toLowerCase().includes('duplicate')) {
          throw error;
        }
      }
      if (!code) throw new Error('No se pudo generar un código único');

      // Register self as host in shift_users
      await supabase.from('shift_users').upsert({
        shift_code: code,
        username: config.username,
        is_host: true,
        totals: EMPTY_TOTALS as unknown as Json,
        last_seen: new Date().toISOString(),
      });

      // El host (caja principal) pasa a llamarse como el usuario
      if (app.cashboxes[0]) app.renameCashbox(app.cashboxes[0].id, config.username);
      update({ role: 'host', code, shiftId, hostUsername: config.username });
      return code;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
      return null;
    } finally { setBusy(false); }
  }, [config.username, update]);

  const joinShift = useCallback(async (code: string) => {
    setBusy(true); setLastError('');
    try {
      if (!config.username) throw new Error('Define tu nombre de usuario primero');
      const c = code.trim();
      if (!/^\d{6}$/.test(c)) throw new Error('El código debe tener 6 dígitos');

      const { data: shift, error: e1 } = await supabase
        .from('shifts')
        .select('code, host_username, shift_id, expires_at')
        .eq('code', c)
        .maybeSingle();
      if (e1) throw e1;
      if (!shift) throw new Error('Código no encontrado');
      if (new Date(shift.expires_at).getTime() < Date.now()) {
        throw new Error('Este turno expiró');
      }

      const { error: e2 } = await supabase.from('shift_users').upsert({
        shift_code: c,
        username: config.username,
        is_host: shift.host_username === config.username,
        totals: EMPTY_TOTALS as unknown as Json,
        last_seen: new Date().toISOString(),
      });
      if (e2) throw e2;

      // Renombra la caja principal con el usuario sincronizado
      if (app.cashboxes[0]) app.renameCashbox(app.cashboxes[0].id, config.username);
      update({
        role: shift.host_username === config.username ? 'host' : 'guest',
        code: c,
        shiftId: shift.shift_id,
        hostUsername: shift.host_username,
      });
      return true;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(false); }
  }, [config.username, update]);

  const leaveShift = useCallback(async () => {
    setBusy(true);
    try {
      if (config.code && config.username) {
        await supabase
          .from('shift_users')
          .delete()
          .eq('shift_code', config.code)
          .eq('username', config.username);
      }
      update({ role: 'idle', code: '', shiftId: '', hostUsername: '' });
      setRemoteUsers([]);
      return true;
    } finally { setBusy(false); }
  }, [config.code, config.username, update]);

  // ---------------------- totals push ----------------------

  const localTotals = useMemo<SyncTotals>(() => {
    const cashDrawer = app.state.cashDrawer ?? 0;
    return {
      zAmount: app.state.zAmount ?? 0,
      tipsTotal: app.state.tipsTotal ?? 0,
      cashDrawer,
      depositsTotal: app.depositsTotal,
      cashCreditTotal: app.cashCreditTotal,
      couponTotal: app.couponTotal,
      totalDinero: app.depositsTotal + cashDrawer + app.cashCreditTotal + app.couponTotal,
      meta: app.meta,
      efectivoReal: app.efectivoReal,
      diferencia: app.diferencia,
      status: app.status,
    };
  }, [
    app.state.zAmount, app.state.tipsTotal, app.state.cashDrawer,
    app.depositsTotal, app.cashCreditTotal, app.couponTotal,
    app.meta, app.efectivoReal, app.diferencia, app.status,
  ]);

  const totalsRef = useRef(localTotals);
  useEffect(() => { totalsRef.current = localTotals; }, [localTotals]);

  const pushNow = useCallback(async () => {
    if (config.role === 'idle' || !config.code || !config.username) return;
    try {
      const { error } = await supabase.from('shift_users').upsert({
        shift_code: config.code,
        username: config.username,
        is_host: config.role === 'host',
        totals: totalsRef.current as unknown as Json,
        last_seen: new Date().toISOString(),
      });
      if (error) throw error;
      setLastError('');
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    }
  }, [config.role, config.code, config.username]);

  // Heartbeat
  useEffect(() => {
    if (config.role === 'idle') return;
    void pushNow();
    const id = window.setInterval(pushNow, PUSH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [config.role, pushNow]);

  // Debounced push when totals change
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (config.role === 'idle') return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { void pushNow(); }, 800);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [localTotals, config.role, pushNow]);

  // ---------------------- realtime pull ----------------------

  const refresh = useCallback(async (code: string) => {
    const { data, error } = await supabase
      .from('shift_users')
      .select('username, is_host, totals, last_seen')
      .eq('shift_code', code);
    if (error) { setLastError(error.message); return; }
    const now = Date.now();
    setRemoteUsers((data ?? []).map(r => ({
      username: r.username,
      isHost: r.is_host,
      lastSeen: r.last_seen,
      online: now - new Date(r.last_seen).getTime() < ONLINE_WINDOW_MS,
      totals: { ...EMPTY_TOTALS, ...((r.totals as Partial<SyncTotals>) || {}) },
    })));
  }, []);

  useEffect(() => {
    if (config.role === 'idle' || !config.code) {
      setRemoteUsers([]);
      return;
    }
    void refresh(config.code);
    const channel = supabase
      .channel(`shift:${config.code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_users', filter: `shift_code=eq.${config.code}` },
        () => { void refresh(config.code); },
      )
      .subscribe();

    // Re-evaluate "online" every 10s even without server events
    const id = window.setInterval(() => { void refresh(config.code); }, 10000);

    return () => {
      window.clearInterval(id);
      void supabase.removeChannel(channel);
    };
  }, [config.role, config.code, refresh]);

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
