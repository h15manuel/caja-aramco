import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { EntryType } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { formatCLP, parseCLPInput, generateId } from '@/lib/format';
import { ArrowDownCircle, CreditCard, Banknote, Plus } from 'lucide-react';
import DenominationPicker from './DenominationPicker';

const entryConfig = {
  [EntryType.DEPOSIT]: { label: 'Depósito', icon: ArrowDownCircle, needsCashier: false, needsCompany: false },
  [EntryType.TIP]: { label: 'Propina', icon: Banknote, needsCashier: false, needsCompany: false },
  [EntryType.CREDIT]: { label: 'Crédito', icon: CreditCard, needsCashier: false, needsCompany: true },
};

interface Props {
  type: EntryType;
  children?: React.ReactNode;
}

export default function EntryDialog({ type, children }: Props) {
  const { addEntry } = useApp();
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [cashier, setCashier] = useState('');
  const [company, setCompany] = useState('');
  const [observation, setObservation] = useState('');
  const [cashCredit, setCashCredit] = useState(false);
  const [denomination, setDenomination] = useState<number | undefined>(undefined);

  const config = entryConfig[type];
  const isDeposit = type === EntryType.DEPOSIT;

  const reset = () => {
    setAmountStr('');
    setCashier('');
    setCompany('');
    setObservation('');
    setCashCredit(false);
    setDenomination(undefined);
  };

  const handleSubmit = () => {
    const amount = parseCLPInput(amountStr);
    if (amount <= 0) return;

    const now = new Date();
    addEntry({
      id: generateId(),
      type,
      amount,
      cashier: config.needsCashier ? cashier : undefined,
      company: config.needsCompany ? company : undefined,
      observation: !isDeposit && observation ? observation : undefined,
      cashCredit: type === EntryType.CREDIT ? cashCredit : undefined,
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

          {config.needsCashier && (
            <div>
              <Label className="text-muted-foreground text-sm">Cajero</Label>
              <Input
                value={cashier}
                onChange={e => setCashier(e.target.value)}
                placeholder="Nombre del cajero"
                className="rounded-2xl bg-secondary border-border"
              />
            </div>
          )}

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

          {type === EntryType.CREDIT && (
            <div className="flex items-center justify-between rounded-2xl bg-secondary/50 p-3">
              <Label className="text-sm text-foreground">Crédito en efectivo</Label>
              <Switch checked={cashCredit} onCheckedChange={setCashCredit} />
            </div>
          )}

          {isDeposit ? (
            <DenominationPicker value={denomination} onChange={setDenomination} />
          ) : (
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
