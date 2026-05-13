import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { formatCLP, parseCLPInput, generateId } from '@/lib/format';
import { EntryType } from '@/types';
import { Ticket, Plus } from 'lucide-react';

export default function CouponDialog() {
  const { addEntry, state } = useApp();
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [observation, setObservation] = useState('');

  const couponTotal = state.entries
    .filter(e => e.type === EntryType.COUPON)
    .reduce((s, e) => s + e.amount, 0);

  const handleSubmit = () => {
    const amount = parseCLPInput(amountStr);
    if (amount <= 0) return;
    const now = new Date();
    addEntry({
      id: generateId(),
      type: EntryType.COUPON,
      amount,
      observation: observation || undefined,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
    });
    setAmountStr('');
    setObservation('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setAmountStr(''); setObservation(''); } }}>
      <DialogTrigger asChild>
        <button className="flex-1 min-w-[80px] m3-surface p-2.5 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors cursor-pointer">
          <Ticket className="w-5 h-5 text-purple-500" />
          <span className="text-xs font-medium text-foreground">Cupones</span>
          {couponTotal > 0 && (
            <span className="text-[9px] text-muted-foreground shield-blur">{formatCLP(couponTotal)}</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Ticket className="w-5 h-5 text-purple-500" />
            Registrar Cupón
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-muted-foreground text-sm">Monto</Label>
            <Input
              value={amountStr ? formatCLP(parseInt(amountStr)) : ''}
              onChange={e => setAmountStr(e.target.value.replace(/\D/g, ''))}
              placeholder="$0"
              className="text-2xl font-bold h-14 rounded-2xl bg-secondary border-border text-foreground"
              inputMode="numeric"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Observación (opcional)</Label>
            <Input
              value={observation}
              onChange={e => setObservation(e.target.value)}
              placeholder="Ej: Cupón Sodexo"
              className="rounded-2xl bg-secondary border-border"
            />
          </div>
          <p className="text-[11px] text-muted-foreground italic px-1">
            Se descuenta de la Meta y suma en el Total Dinero.
          </p>
          <Button
            onClick={handleSubmit}
            className="w-full h-12 rounded-3xl bg-primary text-primary-foreground font-bold text-base"
          >
            <Plus className="w-5 h-5 mr-2" /> Agregar Cupón
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
