import { useState, useEffect, useCallback } from 'react';
import { AppState, CashEntry, defaultAppState } from '@/types';

const STORAGE_KEY = 'caja-control-state';

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultAppState, ...JSON.parse(saved) };
    }
  } catch {}
  return defaultAppState;
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setZAmount = useCallback((v: number) => setState(s => ({ ...s, zAmount: v })), []);
  const setCashDrawer = useCallback((v: number) => setState(s => ({ ...s, cashDrawer: v })), []);
  const toggleShield = useCallback(() => setState(s => ({ ...s, shieldMode: !s.shieldMode })), []);

  const closeShift = useCallback(() => {
    setState(s => {
      const depTotal = s.entries.filter(e => e.type === 'DEPOSIT').reduce((sum, e) => sum + e.amount, 0);
      const cashCreditTot = s.entries.filter(e => e.type === 'CREDIT' && e.cashCredit).reduce((sum, e) => sum + e.amount, 0);
      const m = s.zAmount - s.tipsTotal - cashCreditTot;
      const real = depTotal + s.cashDrawer;
      const diff = real - m;
      const st = diff === 0 ? 'cuadrada' : diff > 0 ? 'sobrante' : 'faltante';

      // Shift date = date of first entry (first deposit starts the shift)
      const firstEntry = s.entries.length > 0 ? s.entries[0] : null;
      const shiftDate = firstEntry ? firstEntry.date : new Date().toISOString().split('T')[0];

      const record = {
        id: crypto.randomUUID(),
        closedAt: new Date().toISOString(),
        date: shiftDate,
        zAmount: s.zAmount,
        tipsTotal: s.tipsTotal,
        cashDrawer: s.cashDrawer,
        depositsTotal: depTotal,
        efectivoReal: real,
        meta: m,
        diferencia: diff,
        status: st as 'cuadrada' | 'sobrante' | 'faltante',
        entries: [...s.entries],
      };

      return {
        ...s,
        zAmount: 0,
        tipsTotal: 0,
        cashDrawer: 0,
        entries: [],
        shiftHistory: [...s.shiftHistory, record],
      };
    });
  }, []);

  const addEntry = useCallback((entry: CashEntry) => {
    setState(s => {
      const newEntries = [...s.entries, entry];
      const tipsTotal = newEntries
        .filter(e => e.type === 'TIP')
        .reduce((sum, e) => sum + e.amount, 0);

      // Auto-discount from cash drawer for deposits and tips
      let newCashDrawer = s.cashDrawer;
      if ((entry.type === 'DEPOSIT' || entry.type === 'TIP') && s.cashDrawer > 0) {
        newCashDrawer = Math.max(0, s.cashDrawer - entry.amount);
      }

      return { ...s, entries: newEntries, tipsTotal, cashDrawer: newCashDrawer };
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setState(s => {
      const newEntries = s.entries.filter(e => e.id !== id);
      const tipsTotal = newEntries
        .filter(e => e.type === 'TIP')
        .reduce((sum, e) => sum + e.amount, 0);
      return { ...s, entries: newEntries, tipsTotal };
    });
  }, []);

  const editEntry = useCallback((id: string, updates: Partial<Pick<CashEntry, 'amount' | 'observation' | 'company' | 'cashCredit' | 'denominations'>>) => {
    setState(s => {
      const newEntries = s.entries.map(e => e.id === id ? { ...e, ...updates } : e);
      const tipsTotal = newEntries
        .filter(e => e.type === 'TIP')
        .reduce((sum, e) => sum + e.amount, 0);
      return { ...s, entries: newEntries, tipsTotal };
    });
  }, []);

  // Computed values
  const depositsTotal = state.entries
    .filter(e => e.type === 'DEPOSIT')
    .reduce((sum, e) => sum + e.amount, 0);

  const cashCreditTotal = state.entries
    .filter(e => e.type === 'CREDIT' && e.cashCredit)
    .reduce((sum, e) => sum + e.amount, 0);

  const meta = state.zAmount - state.tipsTotal - cashCreditTotal;
  const efectivoReal = depositsTotal + state.cashDrawer;
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
    meta,
    efectivoReal,
    diferencia,
    status,
  };
}
