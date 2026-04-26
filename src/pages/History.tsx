import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCLP } from '@/lib/format';
import { EntryType, ShiftRecord, CashEntry, formatDenominations } from '@/types';
import { ArrowDownCircle, CreditCard, Banknote, ChevronDown, ChevronUp, Clock, Share2, Search, FileDown, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function History() {
  const { state } = useApp();
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const icons = { DEPOSIT: ArrowDownCircle, TIP: Banknote, CREDIT: CreditCard };
  const colors = { DEPOSIT: 'text-primary', TIP: 'text-warning', CREDIT: 'text-info' };
  const labels: Record<string, string> = { DEPOSIT: 'Depósito', TIP: 'Propina', CREDIT: 'Crédito' };
  const statusLabels = { cuadrada: 'CUADRADA', sobrante: 'SOBRANTE', faltante: 'FALTANTE' };
  const statusColors = { cuadrada: 'text-green-500', sobrante: 'text-blue-500', faltante: 'text-destructive' };

  const allShifts = useMemo(() =>
    [...state.shiftHistory].sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()),
    [state.shiftHistory]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allShifts;
    const q = search.toLowerCase().trim();
    return allShifts.filter(shift => {
      const d = new Date(shift.closedAt);
      const formatted = format(d, "EEEE d 'de' MMMM yyyy HH:mm", { locale: es }).toLowerCase();
      return formatted.includes(q) || shift.date.includes(q);
    });
  }, [allShifts, search]);

  // Derive new metrics from entries (for backward compat with old shift records)
  const computeMetrics = (shift: ShiftRecord) => {
    const credits = shift.entries.filter(e => e.type === EntryType.CREDIT);
    const cashCredits = credits.filter(e => e.cashCredit);
    const cashCreditTotal = cashCredits.reduce((s, e) => s + e.amount, 0);
    const creditsTotal = credits.reduce((s, e) => s + e.amount, 0);
    const totalidad = shift.depositsTotal + shift.cashDrawer + cashCreditTotal;
    return { credits, cashCredits, cashCreditTotal, creditsTotal, totalidad };
  };

  const shareWhatsApp = (shift: ShiftRecord) => {
    const closed = format(new Date(shift.closedAt), "d/MM/yyyy HH:mm", { locale: es });
    const m = computeMetrics(shift);
    const lines = [
      `📋 *Cierre de Turno*`,
      `📅 ${closed}`,
      ``,
      `💰 *Monto Z:* ${formatCLP(shift.zAmount)}`,
      `🪙 *Propinas:* ${formatCLP(shift.tipsTotal)}`,
      `💳 *Créd. Efectivo:* ${formatCLP(m.cashCreditTotal)}`,
      `🎯 *Meta:* ${formatCLP(shift.meta)}`,
      ``,
      `📥 *Depósitos:* ${formatCLP(shift.depositsTotal)}`,
      `🗄️ *Gaveta:* ${formatCLP(shift.cashDrawer)}`,
      `💵 *Efectivo Real:* ${formatCLP(shift.efectivoReal)}`,
      `📦 *Totalidad a entregar:* ${formatCLP(m.totalidad)}`,
      ``,
      `📊 *Diferencia:* ${formatCLP(shift.diferencia)}`,
      `✅ *Estado:* ${statusLabels[shift.status]}`,
    ];
    if (m.credits.length > 0) {
      lines.push(``, `💳 *Créditos (${m.credits.length}) · Total ${formatCLP(m.creditsTotal)}*`);
      m.credits.forEach(e => {
        const tag = e.cashCredit ? ' (Efectivo)' : '';
        lines.push(`  • ${e.company || 'Crédito'}${tag} — ${formatCLP(e.amount)}`);
      });
    }
    const nonCredit = shift.entries.filter(e => e.type !== EntryType.CREDIT);
    if (nonCredit.length > 0) {
      lines.push(``, `📝 *Movimientos (${nonCredit.length}):*`);
      nonCredit.forEach(e => {
        const label = labels[e.type] || e.type;
        const who = e.cashier || e.company || '';
        const denom = e.denominations ? ` (${formatDenominations(e.denominations)})` : '';
        lines.push(`  • ${label} ${formatCLP(e.amount)}${who ? ` — ${who}` : ''}${denom}`);
      });
    }
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const exportPDF = async (shift: ShiftRecord) => {
    const { default: jsPDF } = await import('jspdf');
    const autoTableMod: any = await import('jspdf-autotable');
    const autoTable = autoTableMod.default || autoTableMod;
    const doc = new jsPDF();
    const primary: [number, number, number] = [26, 188, 156];
    const closed = format(new Date(shift.closedAt), "d 'de' MMMM yyyy HH:mm", { locale: es });
    const m = computeMetrics(shift);

    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Cierre de Turno', 14, 16);
    doc.setFontSize(11);
    doc.text(closed, 14, 26);

    doc.setTextColor(60, 60, 60);
    let y = 45;
    const summary: [string, string][] = [
      ['Monto Z', formatCLP(shift.zAmount)],
      ['Propinas', formatCLP(shift.tipsTotal)],
      ['Créd. Efectivo', formatCLP(m.cashCreditTotal)],
      ['Meta', formatCLP(shift.meta)],
      ['Depósitos', formatCLP(shift.depositsTotal)],
      ['Gaveta', formatCLP(shift.cashDrawer)],
      ['Efectivo Real', formatCLP(shift.efectivoReal)],
      ['Totalidad a entregar', formatCLP(m.totalidad)],
      ['Diferencia', formatCLP(shift.diferencia)],
      ['Estado', statusLabels[shift.status]],
    ];
    doc.setFontSize(10);
    summary.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 14, y);
      y += 6;
    });

    if (m.credits.length > 0) {
      autoTable(doc, {
        startY: y + 4,
        head: [['Hora', 'Empresa', 'Tipo', 'Monto']],
        body: m.credits.map(e => [
          e.time,
          e.company || '-',
          e.cashCredit ? 'Efectivo' : 'Cuenta',
          formatCLP(e.amount),
        ]),
        theme: 'grid',
        headStyles: { fillColor: primary, textColor: [255, 255, 255] },
        styles: { fontSize: 9 },
        didDrawPage: (data: any) => { y = data.cursor.y; },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    const nonCredit = shift.entries.filter(e => e.type !== EntryType.CREDIT);
    if (nonCredit.length > 0) {
      autoTable(doc, {
        startY: y + 4,
        head: [['Hora', 'Tipo', 'Monto', 'Responsable', 'Detalle']],
        body: nonCredit.map(e => {
          const detail = e.denominations
            ? formatDenominations(e.denominations)
            : (e.observation || '-');
          return [e.time, labels[e.type] || e.type, formatCLP(e.amount), e.cashier || e.company || '-', detail];
        }),
        theme: 'grid',
        headStyles: { fillColor: primary, textColor: [255, 255, 255] },
        styles: { fontSize: 9 },
      });
    }
    doc.save(`turno-${shift.date}-${format(new Date(shift.closedAt), 'HHmm')}.pdf`);
  };

  return (
    <div className="space-y-4 pt-2 max-w-lg mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por fecha, mes o día... ej: febrero, 24, lunes"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-12 rounded-3xl bg-card border-border"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(shift => {
            const isExpanded = expandedShift === shift.id;
            const closedDate = new Date(shift.closedAt);
            const m = computeMetrics(shift);
            const nonCredit = shift.entries.filter(e => e.type !== EntryType.CREDIT);
            return (
              <div key={shift.id} className="m3-surface overflow-hidden animate-slide-up">
                <button
                  onClick={() => setExpandedShift(isExpanded ? null : shift.id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium text-foreground text-sm capitalize">
                        {format(closedDate, "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{format(closedDate, 'HH:mm')}</span>
                        <span className={`text-xs font-bold ${statusColors[shift.status]}`}>
                          {statusLabels[shift.status]} {formatCLP(Math.abs(shift.diferencia))}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {/* Summary grid - aligned with new dashboard model */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Monto Z', value: formatCLP(shift.zAmount), color: 'text-foreground' },
                        { label: 'Propinas', value: formatCLP(shift.tipsTotal), color: 'text-warning' },
                        { label: 'Meta', value: formatCLP(shift.meta), color: 'text-foreground' },
                        { label: 'Totalidad', value: formatCLP(m.totalidad), color: 'text-foreground' },
                        { label: 'Depósitos', value: formatCLP(shift.depositsTotal), color: 'text-primary' },
                        { label: 'Gaveta', value: formatCLP(shift.cashDrawer), color: 'text-foreground' },
                        { label: 'Créd. Efectivo', value: formatCLP(m.cashCreditTotal), color: 'text-info' },
                        { label: 'Efectivo Real', value: formatCLP(shift.efectivoReal), color: 'text-foreground' },
                      ].map(item => (
                        <div key={item.label} className="bg-secondary/50 rounded-2xl p-3">
                          <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                          <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => shareWhatsApp(shift)}
                        className="flex-1 rounded-2xl gap-2 bg-secondary/50 border-border"
                      >
                        <Share2 className="w-4 h-4 text-green-500" />
                        <span className="text-foreground text-sm">WhatsApp</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => exportPDF(shift)}
                        className="rounded-2xl gap-2 bg-secondary/50 border-border"
                      >
                        <FileDown className="w-4 h-4 text-primary" />
                        <span className="text-foreground text-sm">PDF</span>
                      </Button>
                    </div>

                    {/* Credits section */}
                    {m.credits.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Créditos · {m.credits.length}
                          </p>
                          <p className="text-xs font-bold text-info">{formatCLP(m.creditsTotal)}</p>
                        </div>
                        {m.credits.map(entry => (
                          <div key={entry.id} className="flex items-center gap-3 bg-secondary/30 rounded-2xl p-2.5">
                            <CreditCard className="w-4 h-4 text-info" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {entry.company || 'Crédito'}
                                {entry.cashCredit && <span className="ml-1 text-[9px] text-warning font-semibold">(Efectivo)</span>}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{entry.time}</p>
                            </div>
                            <p className="text-xs font-bold text-foreground">{formatCLP(entry.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Other movements */}
                    {nonCredit.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Movimientos</p>
                        {nonCredit.map(entry => {
                          const Icon = icons[entry.type];
                          return (
                            <div key={entry.id} className="flex items-center gap-3 bg-secondary/30 rounded-2xl p-2.5">
                              <Icon className={`w-4 h-4 ${colors[entry.type]}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {labels[entry.type]} {entry.cashier && `· ${entry.cashier}`} {entry.company && `· ${entry.company}`}
                                  {entry.denominations ? (
                                    <span className="ml-1 text-[10px] text-warning font-semibold">
                                      ({formatDenominations(entry.denominations)})
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-[10px] text-muted-foreground">{entry.time}</p>
                              </div>
                              <p className="text-xs font-bold text-foreground">{formatCLP(entry.amount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Sin resultados para esta búsqueda' : 'Sin cierres de turno registrados'}</p>
        </div>
      )}
    </div>
  );
}
