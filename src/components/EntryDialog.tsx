import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntryType } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useSyncCtx } from '@/contexts/SyncContext';
import { formatCLP, parseCLPInput, generateId } from '@/lib/format';
import { ArrowDownCircle, CreditCard, Banknote, Plus, Ticket, Users } from 'lucide-react';
import DenominationPicker from './DenominationPicker';

const entryConfig = {
  [EntryType.DEPOSIT]: { label: 'Depósito', icon: ArrowDownCircle, needsCompany: false },
  [EntryType.TIP]: { label: 'Propina', icon: Banknote, needsCompany: false },
  [EntryType.CREDIT]: { label: 'Crédito', icon: CreditCard, needsCompany: true },
  [EntryType.COUPON]: { label: 'Cupón', icon: Ticket, needsCompany: false },
};

interface Props {
  type: EntryType;
  children?: React.ReactNode;
}

const NO_TARGET = '__none__';

export default function EntryDialog({ type, children }: Props) {
  const { addEntry, cashboxes, activeCashbox } = useApp();
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [company, setCompany] = useState('');
  const [observation, setObservation] = useState('');
  const [cashCredit, setCashCredit] = useState(false);
  const [denomination, setDenomination] = useState<number | undefined>(undefined);
  const [targetCashboxId, setTargetCashboxId] = useState<string>(NO_TARGET);

  const config = entryConfig[type];
  const isDeposit = type === EntryType.DEPOSIT;
  const isCredit = type === EntryType.CREDIT;

  // Cajas activas distintas a la actual, candidatas para recibir el crédito en efectivo.
  const targetCandidates = cashboxes.filter(
    b => b.id !== activeCashbox.id && (b.active ?? true),
  );

  const reset = () => {
    setAmountStr('');
    setCompany('');
    setObservation('');
    setCashCredit(false);
    setDenomination(undefined);
    setTargetCashboxId(NO_TARGET);
  };

  const handleSubmit = () => {
    const amount = parseCLPInput(amountStr);
    if (amount <= 0) return;

    const now = new Date();
    addEntry({
      id: generateId(),
      type,
      amount,
      company: config.needsCompany ? company : undefined,
      observation: !isDeposit && !isCredit && observation ? observation : undefined,
      cashCredit: isCredit ? cashCredit : undefined,
      targetCashboxId:
        isCredit && cashCredit && targetCashboxId !== NO_TARGET ? targetCashboxId : undefined,
      denominations: isDeposit ? denomination : undefined,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
    });

    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="rounded-3xl gap-2 h-12">
            <config.icon className="w-4 h-4" />
            {config.label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-3xl bg-card border-border max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <config.icon className="w-5 h-5 text-primary" />
            Registrar {config.label}
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
            />
          </div>

          {config.needsCompany && (
            <div>
              <Label className="text-muted-foreground text-sm">Empresa</Label>
              <Input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Nombre de la empresa"
                className="rounded-2xl bg-secondary border-border"
              />
            </div>
          )}

          {isCredit && (
            <>
              <div className="flex items-center justify-between rounded-2xl bg-secondary/50 p-3">
                <Label className="text-sm text-foreground">Crédito en efectivo</Label>
                <Switch
                  checked={cashCredit}
                  onCheckedChange={(v) => {
                    setCashCredit(v);
                    if (!v) setTargetCashboxId(NO_TARGET);
                  }}
                />
              </div>

              {cashCredit && (
                <div>
                  <Label className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Asignar a (opcional)
                  </Label>
                  <Select value={targetCashboxId} onValueChange={setTargetCashboxId}>
                    <SelectTrigger className="rounded-2xl bg-secondary border-border h-11">
                      <SelectValue placeholder="Mantener en mi caja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TARGET}>Mantener en mi caja</SelectItem>
                      {targetCandidates.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1 px-1">
                    Si lo asignas, en mi caja aparece como crédito normal y el efectivo se suma a la otra persona.
                  </p>
                </div>
              )}
            </>
          )}

          {isDeposit && (
            <DenominationPicker value={denomination} onChange={setDenomination} />
          )}

          {!isDeposit && !isCredit && (
            <div>
              <Label className="text-muted-foreground text-sm">Observación</Label>
              <Input
                value={observation}
                onChange={e => setObservation(e.target.value)}
                placeholder="Opcional"
                className="rounded-2xl bg-secondary border-border"
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            className="w-full h-12 rounded-3xl bg-primary text-primary-foreground font-bold text-base"
          >
            <Plus className="w-5 h-5 mr-2" /> Agregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
