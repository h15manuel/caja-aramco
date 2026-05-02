import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, Check, X, Wifi, WifiOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useApp } from '@/contexts/AppContext';
import { useSyncCtx } from '@/contexts/SyncContext';
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

  const activeBoxes = cashboxes.filter(b => b.active ?? true);
  const totalCashChica = activeBoxes.reduce((sum, b) => sum + b.cashDrawer, 0);

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

        {/* Total caja chica de personas activas */}
        <div className="mt-2 p-3 rounded-2xl bg-primary/10 border border-primary/30">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Total Caja Chica · {activeBoxes.length} en turno
          </p>
          <p className="text-2xl font-bold text-primary mt-0.5">{formatCLP(totalCashChica)}</p>
        </div>

        <div className="space-y-2 mt-3">
          {cashboxes.map(box => {
            const isActiveSelected = box.id === activeCashbox.id;
            const isOnShift = box.active ?? true;
            const isEditing = editingId === box.id;
            const confirmDelete = confirmDeleteId === box.id;

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
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Caja chica: {formatCLP(box.cashDrawer)}
                      </p>
                    </button>
                    {confirmDelete ? (
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
                      <>
                        <button
                          onClick={() => startEdit(box.id, box.name)}
                          className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
                          aria-label="Renombrar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {cashboxes.length > 1 && (
                          <button
                            onClick={() => setConfirmDeleteId(box.id)}
                            className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-destructive"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <Input
            placeholder="Nombre de la persona"
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
      </DialogContent>
    </Dialog>
  );
}
