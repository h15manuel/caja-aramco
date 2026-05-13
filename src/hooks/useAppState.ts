import { useState, useEffect, useCallback } from 'react';
import { AppState, CashEntry, Cashbox, defaultAppState } from '@/types';

const STORAGE_KEY = 'caja-control-state';

interface PersistedV1 {
  zAmount?: number;
  tipsTotal?: number;
  cashDrawer?: number;
  entries?: CashEntry[];
  cashboxes?: Cashbox[];
  activeCashboxId?: string;
  [k: string]: unknown;
}

function migrate(raw: PersistedV1): AppState {
  // Already v2: has cashboxes
  if (Array.isArray(raw.cashboxes) && raw.cashboxes.length > 0) {
    const merged = { ...defaultAppState, ...(raw as Partial<AppState>) } as AppState;
    if (!merged.cashboxes.some(c => c.id === merged.activeCashboxId)) {
      merged.activeCashboxId = merged.cashboxes[0].id;
    }
    return merged;
  }
  // Migrate legacy single-cashbox -> "Caja 1"
  const legacyBox: Cashbox = {
    id: 'cashbox-default',
    name: 'Caja 1',
    zAmount: raw.zAmount ?? 0,
    tipsTotal: raw.tipsTotal ?? 0,
    cashDrawer: raw.cashDrawer ?? 0,
    entries: raw.entries ?? [],
  };
  const { zAmount: _z, tipsTotal: _t, cashDrawer: _c, entries: _e, ...rest } = raw;
  void _z; void _t; void _c; void _e;
  return {
    ...defaultAppState,
    ...(rest as Partial<AppState>),
    cashboxes: [legacyBox],
    activeCashboxId: legacyBox.id,
  };
}

function loadState(): AppState {
  if (typeof window === 'undefined') return defaultAppState;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return migrate(JSON.parse(saved) as PersistedV1);
  } catch {
    // fall through
  }
  return defaultAppState;
}

function updateActiveBox(s: AppState, fn: (b: Cashbox) => Cashbox): AppState {
  return {
    ...s,
    cashboxes: s.cashboxes.map(b => (b.id === s.activeCashboxId ? fn(b) : b)),
  };
}

export function useAppState() {
  const [persisted, setPersisted] = useState<AppState>(loadState);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [persisted]);

  const activeBox =
    persisted.cashboxes.find(b => b.id === persisted.activeCashboxId) ??
    persisted.cashboxes[0];

  const setZAmount = useCallback((v: number) => {
    setPersisted(s => updateActiveBox(s, b => ({ ...b, zAmount: v })));
  }, []);

  const setCashDrawer = useCallback((v: number) => {
    setPersisted(s => updateActiveBox(s, b => ({ ...b, cashDrawer: v })));
  }, []);

  const toggleShield = useCallback(() => {
    setPersisted(s => ({ ...s, shieldMode: !s.shieldMode }));
  }, []);

  // Cashbox management
  const addCashbox = useCallback((name: string) => {
    const trimmed = name.trim() || `Caja ${Date.now()}`;
    const newBox: Cashbox = {
      id: crypto.randomUUID(),
      name: trimmed,
      zAmount: 0,
      tipsTotal: 0,
      cashDrawer: 0,
      entries: [],
      active: true,
    };
    setPersisted(s => ({
      ...s,
      cashboxes: [...s.cashboxes, newBox],
      activeCashboxId: newBox.id,
    }));
  }, []);

  const toggleCashboxActive = useCallback((id: string) => {
    setPersisted(s => ({
      ...s,
      cashboxes: s.cashboxes.map(b =>
        b.id === id ? { ...b, active: !(b.active ?? true) } : b,
      ),
    }));
  }, []);

  const renameCashbox = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPersisted(s => ({
      ...s,
      cashboxes: s.cashboxes.map(b => (b.id === id ? { ...b, name: trimmed } : b)),
    }));
  }, []);

  const removeCashbox = useCallback((id: string) => {
    setPersisted(s => {
      if (s.cashboxes.length <= 1) return s; // siempre debe quedar al menos una
      const remaining = s.cashboxes.filter(b => b.id !== id);
      const nextActive = s.activeCashboxId === id ? remaining[0].id : s.activeCashboxId;
      return { ...s, cashboxes: remaining, activeCashboxId: nextActive };
    });
  }, []);

  const setActiveCashbox = useCallback((id: string) => {
    setPersisted(s =>
      s.cashboxes.some(b => b.id === id) ? { ...s, activeCashboxId: id } : s,
    );
  }, []);

  const closeShift = useCallback(() => {
    setPersisted(s => {
      const box =
        s.cashboxes.find(b => b.id === s.activeCashboxId) ?? s.cashboxes[0];
      const depTotal = box.entries
        .filter(e => e.type === 'DEPOSIT')
        .reduce((sum, e) => sum + e.amount, 0);
      const ownCashCredit = box.entries
        .filter(e => e.type === 'CREDIT' && e.cashCredit && !e.targetCashboxId)
        .reduce((sum, e) => sum + e.amount, 0);
      const incomingCashCredit = s.cashboxes
        .filter(b => b.id !== box.id)
        .flatMap(b => b.entries)
        .filter(e => e.type === 'CREDIT' && e.cashCredit && e.targetCashboxId === box.id)
        .reduce((sum, e) => sum + e.amount, 0);
      const couponTot = box.entries
        .filter(e => e.type === 'COUPON')
        .reduce((sum, e) => sum + e.amount, 0);
      const cashCreditTot = ownCashCredit + incomingCashCredit;
      const m = box.zAmount - box.tipsTotal - cashCreditTot - couponTot;
      const real = depTotal + box.cashDrawer;
      const diff = real - m;
      const st = diff === 0 ? 'cuadrada' : diff > 0 ? 'sobrante' : 'faltante';

      const firstEntry = box.entries.length > 0 ? box.entries[0] : null;
      const shiftDate = firstEntry
        ? firstEntry.date
        : new Date().toISOString().split('T')[0];

      const record = {
        id: crypto.randomUUID(),
        closedAt: new Date().toISOString(),
        date: shiftDate,
        zAmount: box.zAmount,
        tipsTotal: box.tipsTotal,
        cashDrawer: box.cashDrawer,
        depositsTotal: depTotal,
        efectivoReal: real,
        meta: m,
        diferencia: diff,
        status: st as 'cuadrada' | 'sobrante' | 'faltante',
        entries: [...box.entries],
        cashboxId: box.id,
        cashboxName: box.name,
      };

      // Conservamos la primera caja (la principal) con su nombre actual,
      // pero reseteamos sus valores. Las demás cajas se eliminan al cerrar el turno.
      const principal = s.cashboxes[0];
      const resetPrincipal: Cashbox = {
        id: principal.id,
        name: principal.name,
        zAmount: 0,
        tipsTotal: 0,
        cashDrawer: 0,
        entries: [],
        active: true,
      };
      return {
        ...s,
        cashboxes: [resetPrincipal],
        activeCashboxId: resetPrincipal.id,
        shiftHistory: [...s.shiftHistory, record],
      };
    });
  }, []);

  const addEntry = useCallback((entry: CashEntry) => {
    setPersisted(s =>
      updateActiveBox(s, b => {
        const newEntries = [...b.entries, entry];
        const tipsTotal = newEntries
          .filter(e => e.type === 'TIP')
          .reduce((sum, e) => sum + e.amount, 0);
        let newCashDrawer = b.cashDrawer;
        if ((entry.type === 'DEPOSIT' || entry.type === 'TIP') && b.cashDrawer > 0) {
          newCashDrawer = Math.max(0, b.cashDrawer - entry.amount);
        }
        return { ...b, entries: newEntries, tipsTotal, cashDrawer: newCashDrawer };
      }),
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setPersisted(s =>
      updateActiveBox(s, b => {
        const newEntries = b.entries.filter(e => e.id !== id);
        const tipsTotal = newEntries
          .filter(e => e.type === 'TIP')
          .reduce((sum, e) => sum + e.amount, 0);
        return { ...b, entries: newEntries, tipsTotal };
      }),
    );
  }, []);

  const editEntry = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<CashEntry, 'amount' | 'observation' | 'company' | 'cashCredit' | 'denominations'>
      >,
    ) => {
      setPersisted(s =>
        updateActiveBox(s, b => {
          const newEntries = b.entries.map(e => (e.id === id ? { ...e, ...updates } : e));
          const tipsTotal = newEntries
            .filter(e => e.type === 'TIP')
            .reduce((sum, e) => sum + e.amount, 0);
          return { ...b, entries: newEntries, tipsTotal };
        }),
      );
    },
    [],
  );

  // Flattened state: existing pages keep reading state.entries/zAmount/cashDrawer/tipsTotal
  // but those values now come from the active cashbox.
  const state = {
    ...persisted,
    zAmount: activeBox.zAmount,
    tipsTotal: activeBox.tipsTotal,
    cashDrawer: activeBox.cashDrawer,
    entries: activeBox.entries,
  };

  // Wrapper around setPersisted for backwards-compat with existing setState callers
  const setState = setPersisted;

  // Computed values
  const depositsTotal = activeBox.entries
    .filter(e => e.type === 'DEPOSIT')
    .reduce((sum, e) => sum + e.amount, 0);

  // Créditos en efectivo "propios" (sin destino externo) – sí afectan la meta de esta caja.
  const ownCashCreditTotal = activeBox.entries
    .filter(e => e.type === 'CREDIT' && e.cashCredit && !e.targetCashboxId)
    .reduce((sum, e) => sum + e.amount, 0);

  // Créditos en efectivo recibidos desde OTRAS cajas (apuntando a esta).
  const incomingCashCreditTotal = persisted.cashboxes
    .filter(b => b.id !== activeBox.id)
    .flatMap(b => b.entries)
    .filter(e => e.type === 'CREDIT' && e.cashCredit && e.targetCashboxId === activeBox.id)
    .reduce((sum, e) => sum + e.amount, 0);

  // Total de créditos en efectivo que SUMA esta persona en su cuenta.
  const cashCreditTotal = ownCashCreditTotal + incomingCashCreditTotal;

  // Cupones de esta caja – descuentan meta y suman en totalidad.
  const couponTotal = activeBox.entries
    .filter(e => e.type === 'COUPON')
    .reduce((sum, e) => sum + e.amount, 0);

  const meta = activeBox.zAmount - activeBox.tipsTotal - cashCreditTotal - couponTotal;
  const efectivoReal = depositsTotal + activeBox.cashDrawer;
  const diferencia = efectivoReal - meta;

  const status: 'cuadrada' | 'sobrante' | 'faltante' =
    diferencia === 0 ? 'cuadrada' : diferencia > 0 ? 'sobrante' : 'faltante';

  return {
    state,
    setState,
    setZAmount,
    setCashDrawer,
    toggleShield,
    closeShift,
    addEntry,
    editEntry,
    deleteEntry,
    depositsTotal,
    cashCreditTotal,
    couponTotal,
    incomingCashCreditTotal,
    meta,
    efectivoReal,
    diferencia,
    status,
    // Cashbox management
    activeCashbox: activeBox,
    cashboxes: persisted.cashboxes,
    addCashbox,
    renameCashbox,
    removeCashbox,
    setActiveCashbox,
    toggleCashboxActive,
  };
}
