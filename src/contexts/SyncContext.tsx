import React, { createContext, useContext } from 'react';
import { useSync } from '@/hooks/useSync';

type SyncContextType = ReturnType<typeof useSync>;

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const sync = useSync();
  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>;
}

export function useSyncCtx() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncCtx must be inside SyncProvider');
  return ctx;
}
