import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCLP, parseCLPInput } from '@/lib/format';
import { EntryType, CashEntry, formatDenominations } from '@/types';
import QuickCountModal from '@/components/QuickCountModal';
import EntryDialog from '@/components/EntryDialog';
import EditEntryDialog from '@/components/EditEntryDialog';
import { ArrowDownCircle, CreditCard, Banknote, TrendingUp, TrendingDown, CheckCircle2, Target, LogOut, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function usePersistOpen(key: string, defaultValue = true) {
  const [open, setOpen] = useState(() => {
    const stored = sessionStorage.getItem(key);
    return stored !== null ? stored === '1' : defaultValue;
  });
  const toggle = useCallback((v: boolean) => {
    setOpen(v);
    sessionStorage.setItem(key, v ? '1' : '0');
  }, [key]);
  return [open, toggle] as const;
}

function CreditSubgroup({ group, gi, onEdit }: { group: CashEntry[]; gi: number; onEdit: (e: CashEntry) => void }) {
  const [open, setOpen] = usePersistOpen(`col-cred-g${gi}`, true);
  const subtotal = group.reduce((sum, e) => sum + e.amount, 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between cursor-pointer group py-0.5">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase">
          Grupo {gi + 1} ({group.length}/6)
        </p>
        <div className="flex items-center gap-1">
          <p className="text-xs font-bold text-info shield-blur">{formatCLP(subtotal)}</p>
          <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 mt-1">
          {group.map(entry => (
            <div
              key={entry.id}
              className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2 cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => onEdit(entry)}
            >
              <CreditCard className="w-3.5 h-3.5 text-info" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {entry.company || 'Crédito'}
                  {entry.cashCredit && <span className="ml-1 text-[9px] text-warning font-semibold">(Efectivo)</span>}
                </p>
                <p className="text-[10px] text-muted-foreground">{entry.time}</p>
              </div>
              <p className="text-xs font-bold text-foreground shield-blur">{formatCLP(entry.amount)}</p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Dashboard() {
  const { state, setZAmount, closeShift, depositsTotal, cashCreditTotal, meta, efectivoReal, diferencia, status } = useApp();
  const [zInput, setZInput] = useState(state.zAmount > 0 ? state.zAmount.toString() : '');
  const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null);
  const [movOpen, setMovOpen] = usePersistOpen('col-mov', true);
  const [credOpen, setCredOpen] = usePersistOpen('col-cred', true);

  const handleZChange = (val: string) => {
    const nums = val.replace(/\D/g, '');
    setZInput(nums);
    setZAmount(parseInt(nums) || 0);
  };

  const statusConfig = {
    cuadrada: { label: 'CAJA CUADRADA', icon: CheckCircle2, class: 'status-cuadrada' },
    sobrante: { label: 'SOBRANTE', icon: TrendingUp, class: 'status-sobrante' },
    faltante: { label: 'FALTANTE', icon: TrendingDown, class: 'status-faltante' },
  };

  const sc = statusConfig[status];
  const todayEntries = state.entries;

  return (
    <div className="space-y-2 pt-1 max-w-lg mx-auto">
      {/* Status indicator */}
      {state.zAmount > 0 && (
        <div className={`${sc.class} rounded-2xl p-3 flex items-center gap-3`}>
          <sc.icon className="w-5 h-5" />
          <div>
            <p className="font-bold text-base">{sc.label}</p>
            <p className="text-sm opacity-80 shield-blur">{formatCLP(Math.abs(diferencia))}</p>
          </div>
        </div>
      )}

      {/* Z Amount + Gaveta side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div className="m3-surface-elevated p-3 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Desglose</p>
          <input
            value={zInput ? formatCLP(parseInt(zInput)) : ''}
            onChange={e => handleZChange(e.target.value)}
            placeholder="$0"
            inputMode="numeric"
            className="w-full text-2xl font-bold bg-transparent text-foreground outline-none mt-1 shield-blur text-center"
          />
        </div>
        <QuickCountModal />
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="m3-surface p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta</p>
          <p className="text-xl font-bold text-foreground shield-blur mt-1">{formatCLP(meta)}</p>
          <p className="text-[9px] text-muted-foreground leading-tight">Z - Propinas - Créd. Efect.</p>
        </div>
        <div className="m3-surface p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Dinero</p>
          <p className="text-xl font-bold text-foreground shield-blur mt-1">{formatCLP(depositsTotal + state.cashDrawer + cashCreditTotal)}</p>
          <p className="text-[9px] text-muted-foreground leading-tight">Avances + Caja Chica + Créditos</p>
        </div>
        <div className="m3-surface p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Avances</p>
          <p className="text-xl font-bold text-primary shield-blur mt-1">{formatCLP(depositsTotal)}</p>
        </div>
        <div className="m3-surface p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Propinas</p>
          <p className="text-xl font-bold text-warning shield-blur mt-1">{formatCLP(state.tipsTotal)}</p>
        </div>
        <div className="m3-surface p-3 col-span-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Créditos</p>
          <p className="text-xl font-bold text-info shield-blur mt-1">{formatCLP(cashCreditTotal)}</p>
          <p className="text-[9px] text-muted-foreground leading-tight">Se descuenta de la Meta</p>
        </div>
      </div>

      {/* Quick actions - compacto */}
      <div className="flex gap-2 flex-wrap">
        <EntryDialog type={EntryType.DEPOSIT}>
          <button className="flex-1 min-w-[80px] m3-surface p-2.5 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors cursor-pointer">
            <ArrowDownCircle className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Depósito</span>
          </button>
        </EntryDialog>
        <EntryDialog type={EntryType.TIP}>
          <button className="flex-1 min-w-[80px] m3-surface p-2.5 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors cursor-pointer">
            <Banknote className="w-5 h-5 text-warning" />
            <span className="text-xs font-medium text-foreground">Propina</span>
          </button>
        </EntryDialog>
        <EntryDialog type={EntryType.CREDIT}>
          <button className="flex-1 min-w-[80px] m3-surface p-2.5 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors cursor-pointer">
            <CreditCard className="w-5 h-5 text-info" />
            <span className="text-xs font-medium text-foreground">Crédito</span>
          </button>
        </EntryDialog>
      </div>

      {/* Close shift button - compacto */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="w-full m3-surface p-3 flex items-center justify-center gap-2 hover:border-destructive/40 transition-colors">
            <LogOut className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Cerrar Turno</span>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar turno?</AlertDialogTitle>
            <AlertDialogDescription>
              Se limpiará la planilla (Z, gaveta y propinas vuelven a $0). Los movimientos registrados se conservan en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { closeShift(); setZInput(''); }}
            >
              Cerrar Turno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Today's entries (non-credit) - compacto */}
      {todayEntries.filter(e => e.type !== EntryType.CREDIT).length > 0 && (
        <Collapsible open={movOpen} onOpenChange={setMovOpen} className="m3-surface overflow-hidden">
          <CollapsibleTrigger className="w-full p-3 pb-2 flex items-center justify-between cursor-pointer group">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Movimientos de Hoy · {todayEntries.filter(e => e.type === 'DEPOSIT').length} depósitos
            </p>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-1.5">
              {(() => {
                const depositOrder = new Map<string, number>();
                todayEntries
                  .filter(e => e.type === EntryType.DEPOSIT)
                  .forEach((e, i) => depositOrder.set(e.id, i + 1));
                return todayEntries.filter(e => e.type !== EntryType.CREDIT).map(entry => {
                  const icons = { DEPOSIT: ArrowDownCircle, TIP: Banknote, CREDIT: CreditCard };
                  const colors = { DEPOSIT: 'text-primary', TIP: 'text-warning', CREDIT: 'text-info' };
                  const labels = { DEPOSIT: 'Depósito', TIP: 'Propina', CREDIT: 'Crédito' };
                  const Icon = icons[entry.type];
                  const depNum = entry.type === EntryType.DEPOSIT ? depositOrder.get(entry.id) : undefined;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2.5 bg-secondary/50 rounded-xl p-2 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Icon className={`w-4 h-4 ${colors[entry.type]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {labels[entry.type]}{depNum ? ` ${depNum}` : ''} {entry.company && `· ${entry.company}`}
                          {entry.denominations ? (
                            <span className="ml-1 text-[10px] text-warning font-semibold">
                              ({formatDenominations(entry.denominations)})
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{entry.time}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground shield-blur">{formatCLP(entry.amount)}</p>
                    </div>
                  );
                });
              })()}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Credits grouped by 6 - compacto */}
      {(() => {
        const credits = state.entries.filter(e => e.type === EntryType.CREDIT);
        if (credits.length === 0) return null;

        const groups: CashEntry[][] = [];
        for (let i = 0; i < credits.length; i += 6) {
          groups.push(credits.slice(i, i + 6));
        }
        const grandTotal = credits.reduce((sum, e) => sum + e.amount, 0);

        return (
          <Collapsible open={credOpen} onOpenChange={setCredOpen} className="m3-surface overflow-hidden">
            <CollapsibleTrigger className="w-full p-3 pb-2 flex items-center justify-between cursor-pointer group">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Créditos · {credits.length} registros
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-info shield-blur">{formatCLP(grandTotal)}</p>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-3">
                {groups.map((group, gi) => (
                  <CreditSubgroup key={gi} group={group} gi={gi} onEdit={setEditingEntry} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground px-3 pb-2 italic">Los créditos no afectan el saldo de caja</p>
            </CollapsibleContent>
          </Collapsible>
        );
      })()}

      {/* Edit entry dialog */}
      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => { if (!open) setEditingEntry(null); }}
        />
      )}
    </div>
  );
}
