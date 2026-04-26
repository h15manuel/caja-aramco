import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { formatCLP } from '@/lib/format';
import { Calculator, Delete } from 'lucide-react';

export default function QuickCountModal() {
  const { setCashDrawer, state } = useApp();
  const [current, setCurrent] = useState('0');
  const [accumulated, setAccumulated] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  const totalDisplay = accumulated + (parseInt(current) || 0);

  const handleKey = (key: string) => {
    if (key === 'C') {
      setCurrent('0');
      setAccumulated(0);
      setHistory([]);
    } else if (key === '⌫') {
      setCurrent(v => v.length > 1 ? v.slice(0, -1) : '0');
    } else if (key === '+') {
      const val = parseInt(current) || 0;
      if (val > 0) {
        setAccumulated(a => a + val);
        setHistory(h => [...h, val]);
        setCurrent('0');
      }
    } else if (key === 'OK') {
      setCashDrawer(totalDisplay);
      setOpen(false);
    } else {
      setCurrent(v => v === '0' ? key : v + key);
    }
  };

  const resetState = () => {
    const v = state.cashDrawer.toString();
    setCurrent(v);
    setAccumulated(0);
    setHistory([]);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) resetState(); }}>
      <DialogTrigger asChild>
        <button className="m3-surface-elevated p-3 w-full text-center cursor-pointer hover:border-primary/40 transition-colors">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
            Caja Chica
            <Calculator className="w-4 h-4 text-primary" />
          </p>
          <p className="text-2xl font-bold text-foreground shield-blur mt-1">{formatCLP(state.cashDrawer)}</p>
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl bg-card border-border max-w-xs mx-auto p-5">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Conteo Rápido
          </DialogTitle>
        </DialogHeader>

        {/* History of partial sums */}
        {history.length > 0 && (
          <div className="bg-secondary/50 rounded-2xl p-3 space-y-1 max-h-24 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="flex justify-between text-xs text-muted-foreground">
                <span>Parcial {i + 1}</span>
                <span>+ {formatCLP(h)}</span>
              </div>
            ))}
            {parseInt(current) > 0 && (
              <div className="flex justify-between text-xs text-primary font-medium">
                <span>Actual</span>
                <span>+ {formatCLP(parseInt(current))}</span>
              </div>
            )}
          </div>
        )}

        <div className="text-center py-3">
          <p className="text-4xl font-bold text-foreground">{formatCLP(totalDisplay)}</p>
          {accumulated > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Acumulado: {formatCLP(accumulated)} + {formatCLP(parseInt(current) || 0)}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {keys.map(k => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className={`h-14 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
                k === 'C' ? 'bg-destructive/20 text-destructive' :
                k === '⌫' ? 'bg-warning/20 text-warning' :
                'bg-secondary text-foreground hover:bg-muted'
              }`}
            >
              {k === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : k}
            </button>
          ))}
        </div>
        <button
          onClick={() => handleKey('+')}
          className="w-full h-12 rounded-2xl font-bold text-lg bg-primary/20 text-primary transition-all active:scale-95 mt-1"
        >
          + Sumar parcial
        </button>
        <Button
          onClick={() => handleKey('OK')}
          className="w-full h-14 rounded-3xl bg-primary text-primary-foreground font-bold text-lg mt-2"
        >
          Confirmar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
