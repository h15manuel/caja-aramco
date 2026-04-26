import React, { useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CustomShiftType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TimePicker from '@/components/TimePicker';

// Built-in shift definitions (always available)
const builtInShifts: Record<string, { label: string; short: string; color: string; hours: boolean; defaultHours: number }> = {
  morning: { label: 'Mañana', short: 'M', color: 'bg-warning text-warning-foreground', hours: true, defaultHours: 7.5 },
  afternoon: { label: 'Tarde', short: 'T', color: 'bg-info text-info-foreground', hours: true, defaultHours: 7.5 },
  night: { label: 'Noche', short: 'N', color: 'bg-primary text-primary-foreground', hours: true, defaultHours: 7.5 },
  free: { label: 'Libre', short: 'L', color: 'bg-success text-success-foreground', hours: false, defaultHours: 0 },
  none: { label: 'Borrar', short: '✕', color: 'bg-destructive/20 text-destructive', hours: false, defaultHours: 0 },
};

const colorOptions = [
  { bg: 'bg-warning', text: 'text-warning-foreground', label: 'Amarillo' },
  { bg: 'bg-info', text: 'text-info-foreground', label: 'Azul' },
  { bg: 'bg-primary', text: 'text-primary-foreground', label: 'Verde' },
  { bg: 'bg-success', text: 'text-success-foreground', label: 'Verde claro' },
  { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'Rojo' },
  { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Gris' },
  { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'Oscuro' },
  { bg: 'bg-purple-600', text: 'text-white', label: 'Morado' },
  { bg: 'bg-orange-500', text: 'text-white', label: 'Naranja' },
  { bg: 'bg-pink-500', text: 'text-white', label: 'Rosa' },
];

export default function Shifts() {
  const { state, setState } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string>('morning');
  const [selectedHours, setSelectedHours] = useState<number>(7.5);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<CustomShiftType | null>(null);

  // Form state for create/edit dialog
  const [formName, setFormName] = useState('');
  const [formShort, setFormShort] = useState('');
  const [formStartTime, setFormStartTime] = useState('06:00');
  const [formEndTime, setFormEndTime] = useState('14:00');
  const [formColorIdx, setFormColorIdx] = useState(0);
  const [formCountsHours, setFormCountsHours] = useState(true);
  const [pickingTime, setPickingTime] = useState<'start' | 'end'>('start');

  // Auto-calculate hours from schedule minus 30min colación
  const calcHours = useCallback((start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) totalMin += 24 * 60; // overnight shift
    const netHours = (totalMin - 30) / 60; // subtract 30min colación
    return Math.max(0, Math.round(netHours * 2) / 2); // round to nearest 0.5
  }, []);

  const computedHours = useMemo(() => calcHours(formStartTime, formEndTime), [formStartTime, formEndTime, calcHours]);
  const formSchedule = `${formStartTime} - ${formEndTime}`;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7;
  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => null);

  // Merge built-in + custom shifts into a unified config
  const allShiftConfig = useMemo(() => {
    const config: Record<string, { label: string; short: string; color: string; hours: boolean; defaultHours: number; schedule?: string }> = { ...builtInShifts };
    for (const cs of (state.customShiftTypes || [])) {
      config[cs.id] = {
        label: cs.label,
        short: cs.short,
        color: `${cs.color} ${cs.textColor}`,
        hours: cs.hours,
        defaultHours: cs.defaultHours,
        schedule: cs.schedule,
      };
    }
    return config;
  }, [state.customShiftTypes]);

  const allShiftKeys = useMemo(() => {
    const builtInKeys = ['morning', 'afternoon', 'night', 'free'];
    const customKeys = (state.customShiftTypes || []).map(c => c.id);
    return [...builtInKeys, ...customKeys, 'none'];
  }, [state.customShiftTypes]);

  const getShiftData = (dateStr: string) => state.shifts.find(s => s.date === dateStr);
  const getShift = (dateStr: string): string => getShiftData(dateStr)?.shift || 'none';
  const getHours = (dateStr: string): number => getShiftData(dateStr)?.hours || 7.5;

  const applyShift = (dateStr: string) => {
    setState(s => {
      const filtered = s.shifts.filter(sh => sh.date !== dateStr);
      if (selectedShift === 'none') return { ...s, shifts: filtered };
      const cfg = allShiftConfig[selectedShift];
      const hasHours = cfg?.hours ?? false;
      return {
        ...s,
        shifts: [...filtered, { date: dateStr, shift: selectedShift, hours: hasHours ? selectedHours : undefined }],
      };
    });
  };

  // Open create dialog
  const openCreate = () => {
    setEditingShift(null);
    setFormName('');
    setFormShort('');
    setFormStartTime('06:00');
    setFormEndTime('14:00');
    setFormColorIdx(0);
    setFormCountsHours(true);
    setPickingTime('start');
    setShowCreateDialog(true);
  };

  // Open edit dialog
  const openEdit = (cs: CustomShiftType) => {
    setEditingShift(cs);
    setFormName(cs.label);
    setFormShort(cs.short);
    if (cs.schedule) {
      const parts = cs.schedule.split(' - ');
      setFormStartTime(parts[0] || '06:00');
      setFormEndTime(parts[1] || '14:00');
    } else {
      setFormStartTime('06:00');
      setFormEndTime('14:00');
    }
    setFormCountsHours(cs.hours);
    setPickingTime('start');
    const idx = colorOptions.findIndex(c => c.bg === cs.color);
    setFormColorIdx(idx >= 0 ? idx : 0);
    setShowCreateDialog(true);
  };

  const saveShift = () => {
    if (!formName.trim()) return;
    const col = colorOptions[formColorIdx];
    const newShift: CustomShiftType = {
      id: editingShift?.id || `custom_${Date.now()}`,
      label: formName.trim(),
      short: formShort.trim() || formName.trim()[0].toUpperCase(),
      color: col.bg,
      textColor: col.text,
      hours: formCountsHours,
      defaultHours: computedHours,
      schedule: formCountsHours ? formSchedule : undefined,
    };
    setState(s => {
      const existing = s.customShiftTypes || [];
      if (editingShift) {
        return { ...s, customShiftTypes: existing.map(c => c.id === editingShift.id ? newShift : c) };
      }
      return { ...s, customShiftTypes: [...existing, newShift] };
    });
    setShowCreateDialog(false);
  };

  const deleteCustomShift = (id: string) => {
    setState(s => ({
      ...s,
      customShiftTypes: (s.customShiftTypes || []).filter(c => c.id !== id),
      shifts: s.shifts.filter(sh => sh.shift !== id),
    }));
    if (selectedShift === id) setSelectedShift('morning');
  };

  const cycles = useMemo(() => {
    const sorted = [...state.shifts]
      .filter(s => s.shift !== 'none')
      .sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return [];

    const allCycles: { start: string; end: string; hours: number; overLimit: boolean }[] = [];
    let cycleStart: string | null = null;
    let hoursAccum = 0;

    for (const s of sorted) {
      if (s.shift === 'free') {
        if (cycleStart !== null && hoursAccum > 0) {
          allCycles.push({ start: cycleStart, end: s.date, hours: hoursAccum, overLimit: hoursAccum > state.weeklyHours });
        }
        cycleStart = null;
        hoursAccum = 0;
      } else {
        if (cycleStart === null) cycleStart = s.date;
        hoursAccum += (s.hours || 7.5);
      }
    }
    if (cycleStart !== null && hoursAccum > 0) {
      allCycles.push({ start: cycleStart, end: sorted[sorted.length - 1].date, hours: hoursAccum, overLimit: hoursAccum > state.weeklyHours });
    }

    const mStart = format(monthStart, 'yyyy-MM-dd');
    const mEnd = format(monthEnd, 'yyyy-MM-dd');
    return allCycles.filter(c => c.start <= mEnd && c.end >= mStart);
  }, [state.shifts, state.weeklyHours, monthStart, monthEnd]);

  return (
    <div className="space-y-4 pt-2 max-w-lg mx-auto">
      {/* Jornada semanal */}
      <div className="m3-surface p-4">
        <p className="text-xs text-muted-foreground mb-1">Jornada semanal</p>
        <select
          value={state.weeklyHours}
          onChange={e => setState(s => ({ ...s, weeklyHours: Number(e.target.value) as any }))}
          className="w-full h-9 rounded-2xl bg-secondary border border-border px-3 text-sm text-foreground"
        >
          <option value={44}>44 horas</option>
          <option value={42}>42 horas</option>
          <option value={40}>40 horas</option>
        </select>
      </div>

      {/* Shift + hours picker */}
      <div className="m3-surface p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Selecciona turno y toca los días</p>
          <button onClick={openCreate} className="p-1.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allShiftKeys.map(type => {
            const cfg = allShiftConfig[type];
            if (!cfg) return null;
            const isActive = selectedShift === type;
            const isCustom = !builtInShifts[type];
            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedShift(type);
                  if (cfg.hours && cfg.defaultHours) setSelectedHours(cfg.defaultHours);
                }}
                onContextMenu={isCustom ? (e) => { e.preventDefault(); openEdit((state.customShiftTypes || []).find(c => c.id === type)!); } : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${cfg.color} ${
                  isActive ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background scale-105' : 'opacity-60'
                }`}
              >
                {cfg.label}
                {cfg.schedule && isActive && <span className="ml-1 opacity-70 text-[9px]">({cfg.schedule})</span>}
              </button>
            );
          })}
        </div>
        {allShiftConfig[selectedShift]?.hours && (
          <div className="flex gap-2 items-center">
            <p className="text-[10px] text-muted-foreground">Horas:</p>
            {[7.5, 6.5, allShiftConfig[selectedShift]?.defaultHours].filter((v, i, arr) => v && arr.indexOf(v) === i).map(h => (
              <button
                key={h}
                onClick={() => setSelectedHours(h!)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  selectedHours === h
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-1">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-secondary">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-secondary">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="m3-surface p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const shift = getShift(dateStr);
            const cfg = allShiftConfig[shift] || allShiftConfig['none'];
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
            const dayHours = getHours(dateStr);
            const isWorkShift = shift !== 'none' && shift !== 'free' && cfg.hours;
            return (
              <button
                key={dateStr}
                onClick={() => applyShift(dateStr)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all active:scale-95 ${
                  cfg.color || 'hover:bg-secondary text-foreground'
                } ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
              >
                <span className="text-[10px] opacity-70">{format(day, 'd')}</span>
                {cfg.short && <span className="text-[10px] font-bold">{cfg.short}</span>}
                {isWorkShift && <span className="text-[8px] opacity-80">{dayHours}h</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-1">
        {Object.entries(allShiftConfig).filter(([k]) => k !== 'none').map(([key, cfg]) => (
          <div key={key} className={`${cfg.color} rounded-full px-3 py-1 text-xs font-medium`}>
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Custom shifts management */}
      {(state.customShiftTypes || []).length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Turnos personalizados</p>
          {(state.customShiftTypes || []).map(cs => (
            <div key={cs.id} className="m3-surface p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${cs.color} ${cs.textColor}`}>
                  {cs.short}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{cs.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {cs.hours ? `${cs.defaultHours}h` : 'Sin horas'}
                    {cs.schedule && ` · ${cs.schedule}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(cs)} className="p-1.5 rounded-full hover:bg-secondary">
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => deleteCustomShift(cs.id)} className="p-1.5 rounded-full hover:bg-destructive/20">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cycles compliance */}
      {cycles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">Ciclos de Cumplimiento</p>
          {cycles.map((cycle, i) => (
            <div
              key={i}
              className={`m3-surface p-4 border-l-4 ${cycle.overLimit ? 'border-l-destructive' : 'border-l-success'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(cycle.start + 'T12:00'), 'dd/MM')} — {format(new Date(cycle.end + 'T12:00'), 'dd/MM')}
                  </p>
                  <p className="text-xs text-muted-foreground">{cycle.hours}h trabajadas / {state.weeklyHours}h máximo</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  cycle.overLimit ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
                }`}>
                  {cycle.overLimit ? 'EXCEDIDO' : 'CUMPLE'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit shift dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Editar turno' : 'Nuevo turno'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Turno especial" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Abreviatura (1-2 letras)</label>
              <Input value={formShort} onChange={e => setFormShort(e.target.value.slice(0, 2))} placeholder="Ej: TE" maxLength={2} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground">¿Cuenta horas?</label>
              <button
                onClick={() => setFormCountsHours(!formCountsHours)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${formCountsHours ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                {formCountsHours ? 'Sí' : 'No'}
              </button>
            </div>
            {formCountsHours && (
              <div className="space-y-3">
                {/* Time picker tabs */}
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setPickingTime('start')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      pickingTime === 'start' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    Entrada: {formStartTime}
                  </button>
                  <button
                    onClick={() => setPickingTime('end')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      pickingTime === 'end' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    Salida: {formEndTime}
                  </button>
                </div>

                <TimePicker
                  value={pickingTime === 'start' ? formStartTime : formEndTime}
                  onChange={(v) => {
                    if (pickingTime === 'start') {
                      setFormStartTime(v);
                      // Auto-advance to end time after selecting start
                      setTimeout(() => setPickingTime('end'), 300);
                    } else {
                      setFormEndTime(v);
                    }
                  }}
                />

                {/* Calculated hours display */}
                <div className="text-center p-3 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase">Horas netas (menos 30min colación)</p>
                  <p className="text-2xl font-bold text-foreground">{computedHours}h</p>
                  <p className="text-[10px] text-muted-foreground">{formSchedule}</p>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFormColorIdx(idx)}
                    className={`w-8 h-8 rounded-full ${col.bg} ${
                      formColorIdx === idx ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
            <Button onClick={saveShift} className="w-full" disabled={!formName.trim()}>
              {editingShift ? 'Guardar cambios' : 'Crear turno'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
