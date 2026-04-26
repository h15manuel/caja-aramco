import React, { useRef, useEffect, useCallback } from 'react';

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  label?: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');

function ScrollColumn({ items, selected, onSelect }: {
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 40;
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to selected on mount and when selected changes externally
  useEffect(() => {
    if (containerRef.current && !isUserScrolling.current) {
      const idx = items.indexOf(selected);
      if (idx >= 0) {
        containerRef.current.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
      }
    }
  }, [selected, items]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const idx = Math.round(scrollTop / itemHeight);
      const clampedIdx = Math.max(0, Math.min(items.length - 1, idx));
      
      // Snap to nearest item
      containerRef.current.scrollTo({ top: clampedIdx * itemHeight, behavior: 'smooth' });
      
      // Select the item
      if (items[clampedIdx] !== selected) {
        onSelect(items[clampedIdx]);
      }
      
      setTimeout(() => { isUserScrolling.current = false; }, 100);
    }, 80);
  }, [items, selected, onSelect]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[160px] overflow-y-auto scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Top padding: 2 items to center first item */}
      <div style={{ height: `${itemHeight * 2}px` }} />
      {items.map(item => {
        const isSelected = item === selected;
        return (
          <div
            key={item}
            className={`flex items-center justify-center text-lg font-medium transition-all duration-150 ${
              isSelected
                ? 'text-primary font-bold scale-110'
                : 'text-muted-foreground/40'
            }`}
            style={{ height: `${itemHeight}px` }}
          >
            {pad(item)}
          </div>
        );
      })}
      {/* Bottom padding */}
      <div style={{ height: `${itemHeight * 2}px` }} />
    </div>
  );
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [h, m] = (value || '00:00').split(':').map(Number);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="space-y-2">
      {label && <label className="text-xs text-muted-foreground block">{label}</label>}
      <div className="flex items-center justify-center gap-0 bg-secondary/50 rounded-2xl border border-border overflow-hidden">
        <div className="w-24 relative">
          <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-11 bg-primary/20 rounded-full pointer-events-none z-0" />
          <ScrollColumn
            items={hours}
            selected={h}
            onSelect={(v) => onChange(`${pad(v)}:${pad(m)}`)}
          />
        </div>
        <span className="text-xl font-bold text-muted-foreground/60">:</span>
        <div className="w-24 relative">
          <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-11 bg-primary/20 rounded-full pointer-events-none z-0" />
          <ScrollColumn
            items={minutes}
            selected={m}
            onSelect={(v) => onChange(`${pad(h)}:${pad(v)}`)}
          />
        </div>
      </div>
    </div>
  );
}
