import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';

export function CashboxManagerDialog() {
  const {
    cashboxes,
    activeCashbox,
    setActiveCashbox,
    addCashbox,
    renameCashbox,
    removeCashbox,
  } = useApp();

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-2.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all"
          title="Gestionar cajas"
          aria-label="Gestionar cajas"
        >
          <Users className="w-5 h-5" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cajas</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {cashboxes.map(box => {
            const isActive = box.id === activeCashbox.id;
            const isEditing = editingId === box.id;
            const confirmDelete = confirmDeleteId === box.id;

            return (
              <div
                key={box.id}
                className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-card border-border'
                }`}
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
                    <button
                      onClick={() => handleSelect(box.id)}
                      className="flex-1 text-left"
                    >
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {box.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {box.entries.length} movimientos · Z {box.zAmount.toLocaleString('es-CL')}
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
            placeholder="Nombre de la persona / caja"
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
