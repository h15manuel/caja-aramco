import React, { useState } from 'react';
import { CLP_DENOMINATIONS } from '@/types';
import { Coins, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  /** Selected denomination value (e.g. 20000). 0/undefined = none */
  value?: number;
  onChange: (denom: number | undefined) => void;
  defaultOpen?: boolean;
}

const formatLabel = (n: number) => n.toLocaleString('es-CL');

export default function DenominationPicker({ value, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl bg-secondary/50 border border-border overflow-hidden">
      <CollapsibleTrigger className="w-full p-3 flex items-center justify-between cursor-pointer group">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Denominación</span>
          {value ? (
            <span className="text-[11px] text-warning font-semibold">· {formatLabel(value)}</span>
          ) : null}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-2 grid grid-cols-3 gap-1.5 border-t border-border">
          {CLP_DENOMINATIONS.map(denom => {
            const selected = value === denom;
            return (
              <button
                key={denom}
                type="button"
                onClick={() => onChange(selected ? undefined : denom)}
                className={`py-2 rounded-xl text-xs font-bold transition-colors active:scale-95 ${
                  selected
                    ? 'bg-warning text-warning-foreground'
                    : 'bg-background/60 text-foreground hover:bg-background'
                }`}
              >
                {formatLabel(denom)}
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
