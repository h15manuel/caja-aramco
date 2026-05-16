import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, Check, X, Wifi, WifiOff, Eye, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useApp } from '@/contexts/AppContext';
import { useSyncCtx } from '@/contexts/SyncContext';
import type { RemoteUser } from '@/hooks/useSync';
import { formatCLP } from '@/lib/format';

export function CashboxManagerDialog() {
  const {
    cashboxes,
    activeCashbox,
    setActiveCashbox,
    addCashbox,
    renameCashbox,
    removeCashbox,
    toggleCashboxActive,
  } = useApp();
  const { config: syncConfig, remoteUsers } = useSyncCtx();

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<RemoteUser | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCashbox(newName);
    setNewName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const commitEdit = () => {
    if (editingId && editName.trim()) {
      renameCashbox(editingId, editName);
    }
    setEditingId(null);
    setEditName('');
  };

  const handleSelect = (id: string) => {
    setActiveCashbox(id);
    setOpen(false);
  };

  const isSyncing = syncConfig.role !== 'idle';
  const isHost = syncConfig.role === 'host';
  const canManageBoxes = !isSyncing || isHost;

  // Remotos distintos a mí (yo ya estoy representado por cashbox[0])
  const otherRemote = remoteUsers.filter(
    u => u.username.toLowerCase() !== syncConfig.username.toLowerCase(),
  );

  // Cajas locales visibles: si soy guest, solo la principal
  const visibleLocalBoxes = isSyncing && !isHost ? cashboxes.slice(0, 1) : cashboxes;

  const activeLocalBoxes = visibleLocalBoxes.filter(b => b.active ?? true);
  const localCashChica = activeLocalBoxes.reduce((sum, b) => sum + b.cashDrawer, 0);
  // Solo el host puede ver datos financieros de los demás
  const remoteCashChica = isHost
    ? otherRemote.filter(u => u.online).reduce((sum, u) => sum + (u.totals.cashDrawer ?? 0), 0)
    : 0;
  const totalCashChica = localCashChica + remoteCashChica;
  const peopleCount = activeLocalBoxes.length + otherRemote.filter(u => u.online).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-2.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all"
          title="Gestionar personas en turno"
          aria-label="Gestionar personas en turno"
        >
          <Users className="w-5 h-5" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personas en turno</DialogTitle>
        </DialogHeader>

        {/* Total caja chica (locales + remotos online) */}
        <div className="mt-2 p-3 rounded-2xl bg-primary/10 border border-primary/30">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Total Caja Chica · {peopleCount} en turno
          </p>
          <p className="text-2xl font-bold text-primary mt-0.5">{formatCLP(totalCashChica)}</p>
        </div>

        <div className="space-y-2 mt-3">
          {visibleLocalBoxes.map((box, idx) => {
            const isActiveSelected = box.id === activeCashbox.id;
            const isOnShift = box.active ?? true;
            const isEditing = editingId === box.id;
            const confirmDelete = confirmDeleteId === box.id;
            const isPrincipal = idx === 0;
            const isMeSynced = isSyncing && isPrincipal;

            return (
              <div
                key={box.id}
                className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${
                  isActiveSelected
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-card border-border'
                } ${!isOnShift ? 'opacity-60' : ''}`}
              >
                {isEditing ? (
                  <>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditName('');
                        }
                      }}
                      autoFocus
                      className="flex-1 h-9"
                    />
                    <button
                      onClick={commitEdit}
                      className="p-2 rounded-xl bg-primary text-primary-foreground"
                      aria-label="Guardar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditName('');
                      }}
                      className="p-2 rounded-xl bg-secondary text-muted-foreground"
                      aria-label="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Checkbox
                      checked={isOnShift}
                      onCheckedChange={() => toggleCashboxActive(box.id)}
                      aria-label={`Marcar ${box.name} en turno`}
                    />
                    {isMeSynced && (
                      <span title="En línea — esta soy yo">
                        <Wifi className="w-4 h-4 text-green-500" />
                      </span>
                    )}
                    <button
                      onClick={() => handleSelect(box.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActiveSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {box.name}
                        {isMeSynced && (
                          <span className="ml-1.5 text-[9px] uppercase text-primary">
                            {isHost ? 'host · yo' : 'yo'}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Caja chica: {formatCLP(box.cashDrawer)}
                      </p>
                    </button>
                    {canManageBoxes && confirmDelete ? (
                      <>
                        <button
                          onClick={() => {
                            removeCashbox(box.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold"
                        >
                          Borrar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-2 rounded-xl bg-secondary text-muted-foreground"
                          aria-label="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      canManageBoxes && (
                        <>
                          <button
                            onClick={() => startEdit(box.id, box.name)}
                            className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
                            aria-label="Renombrar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {!isPrincipal && cashboxes.length > 1 && (
                            <button
                              onClick={() => setConfirmDeleteId(box.id)}
                              className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-destructive"
                              aria-label="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Remotos sincronizados (excluye-me) */}
          {isSyncing && otherRemote.map(u => (
            <div
              key={`remote-${u.username}`}
              className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border"
            >
              <span title={u.online ? 'Online — datos en tiempo real' : 'Offline'}>
                {u.online
                  ? <Wifi className="w-4 h-4 text-green-500" />
                  : <WifiOff className="w-4 h-4 text-muted-foreground/40" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {u.username}
                  {u.isHost && <span className="ml-1.5 text-[9px] uppercase text-primary">host</span>}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {u.online ? 'En línea' : 'Desconectado'}
                  {isHost && <> · Caja chica: {formatCLP(u.totals.cashDrawer)}</>}
                </p>
              </div>
              {isHost && (
                <>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCLP(u.totals.totalDinero)}
                  </span>
                  <button
                    onClick={() => setViewingUser(u)}
                    className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-primary"
                    aria-label={`Ver caja de ${u.username}`}
                    title="Ver caja"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {isSyncing && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-3 text-center">
            Sincronizado · turno {syncConfig.code} · {remoteUsers.filter(u => u.online).length}/{remoteUsers.length} online
          </p>
        )}

        {canManageBoxes && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <Input
              placeholder={isHost ? 'Nueva caja offline' : 'Nombre de la persona'}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd();
              }}
              className="flex-1 h-10"
            />
            <Button onClick={handleAdd} disabled={!newName.trim()} size="icon" className="h-10 w-10">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        )}
      </DialogContent>

      <RemoteUserDialog user={viewingUser} onClose={() => setViewingUser(null)} />
    </Dialog>
  );
}

function RemoteUserDialog({ user, onClose }: { user: RemoteUser | null; onClose: () => void }) {
  const t = user?.totals;
  const statusCfg = {
    cuadrada: { label: 'CAJA CUADRADA', Icon: CheckCircle2, cls: 'text-green-500' },
    sobrante: { label: 'SOBRANTE', Icon: TrendingUp, cls: 'text-info' },
    faltante: { label: 'FALTANTE', Icon: TrendingDown, cls: 'text-destructive' },
  } as const;
  const sc = t ? statusCfg[t.status] : null;

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="rounded-3xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className={`w-4 h-4 ${user?.online ? 'text-green-500' : 'text-muted-foreground/40'}`} />
            Caja de {user?.username}
            {user?.isHost && <span className="text-[10px] uppercase text-primary">host</span>}
          </DialogTitle>
          <DialogDescription>
            {user?.online ? 'En línea · tiempo real' : 'Desconectado'}
          </DialogDescription>
        </DialogHeader>

        {t && sc && (
          <div className="space-y-2">
            <div className="rounded-2xl p-3 flex items-center gap-3 bg-secondary/50">
              <sc.Icon className={`w-5 h-5 ${sc.cls}`} />
              <div>
                <p className={`font-bold text-base ${sc.cls}`}>{sc.label}</p>
                <p className="text-sm opacity-80">{formatCLP(Math.abs(t.diferencia))}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Cell label="Total Desglose" value={formatCLP(t.zAmount)} />
              <Cell label="Caja Chica" value={formatCLP(t.cashDrawer)} />
              <Cell label="Meta" value={formatCLP(t.meta)} />
              <Cell label="Total Dinero" value={formatCLP(t.totalDinero)} className="col-span-2" accent />
              <Cell label="Total Avances" value={formatCLP(t.depositsTotal)} />
              <Cell label="Propinas" value={formatCLP(t.tipsTotal)} />
              <Cell label="Total Créditos" value={formatCLP(t.cashCreditTotal)} />
              <Cell label="Total Cupones" value={formatCLP(t.couponTotal)} />
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Actualizado: {new Date(user!.lastSeen).toLocaleTimeString()}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Cell({ label, value, accent, className }: { label: string; value: string; accent?: boolean; className?: string }) {
  return (
    <div className={`rounded-xl bg-card border border-border p-2.5 text-center ${className ?? ''}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
