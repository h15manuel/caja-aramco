import React, { useState, useMemo } from 'react';
import { Search, Truck, Car, Plus, Settings2, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { fuzzyScore } from '@/lib/fuzzySearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { generateId } from '@/lib/format';
import type { Company, Vehicle } from '@/types';

const vehicleEmoji: Record<string, string> = { truck: '🚛', car: '🚗', pickup: '🛻' };
const vehicleLabel: Record<string, string> = { truck: 'Camión', car: 'Auto', pickup: 'Camioneta' };

export default function Fleet() {
  const { state, setState } = useApp();
  const [query, setQuery] = useState('');
  const [adminMode, setAdminMode] = useState(false);

  // Admin form state
  const [companyName, setCompanyName] = useState('');
  const [companyRut, setCompanyRut] = useState('');
  const [bulkPlates, setBulkPlates] = useState('');
  const [bulkCompanyId, setBulkCompanyId] = useState('');
  const [bulkType, setBulkType] = useState<'truck' | 'car' | 'pickup'>('truck');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const scored: { vehicle: Vehicle; company?: Company; score: number }[] = [];
    for (const v of state.vehicles) {
      const company = state.companies.find(c => c.id === v.companyId);
      const plateScore = fuzzyScore(query, v.plate);
      const companyScore = company ? fuzzyScore(query, company.name) : 0;
      const best = Math.max(plateScore, companyScore);
      if (best > 0) scored.push({ vehicle: v, company, score: best });
    }
    return scored.sort((a, b) => b.score - a.score);
  }, [query, state.vehicles, state.companies]);

  const addCompany = () => {
    if (!companyName.trim()) return;
    setState(s => ({
      ...s,
      companies: [...s.companies, { id: generateId(), name: companyName.trim(), rut: companyRut.trim() }],
    }));
    setCompanyName('');
    setCompanyRut('');
  };

  const addBulkVehicles = () => {
    if (!bulkPlates.trim() || !bulkCompanyId) return;
    const plates = bulkPlates.split('\n').map(p => p.trim().toUpperCase()).filter(Boolean);
    const newVehicles: Vehicle[] = plates.map(plate => ({
      id: generateId(),
      plate,
      type: bulkType,
      companyId: bulkCompanyId,
    }));
    setState(s => ({ ...s, vehicles: [...s.vehicles, ...newVehicles] }));
    setBulkPlates('');
  };

  const deleteCompany = (id: string) => {
    setState(s => ({
      ...s,
      companies: s.companies.filter(c => c.id !== id),
      vehicles: s.vehicles.filter(v => v.companyId !== id),
    }));
  };

  return (
    <div className="space-y-4 pt-2 max-w-lg mx-auto">
      {/* Search */}
      <div className="m3-surface-elevated p-5">
        <div className="flex items-center gap-3 bg-secondary rounded-2xl px-4 h-12">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar patente o empresa..."
            className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Results */}
      {query.trim() && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Sin resultados para "{query}"</p>
        </div>
      )}

      {results.map(({ vehicle, company }) => (
        <div key={vehicle.id} className="m3-surface p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{vehicleEmoji[vehicle.type]}</span>
            <div className="flex-1">
              <p className="text-xl font-bold text-foreground tracking-widest">{vehicle.plate}</p>
              <p className="text-xs text-muted-foreground">{vehicleLabel[vehicle.type]}</p>
            </div>
          </div>
          {company && (
            <div className="mt-3 bg-secondary rounded-2xl p-3">
              <p className="text-sm font-medium text-foreground">{company.name}</p>
              <p className="text-xs text-muted-foreground">RUT: {company.rut || 'N/A'}</p>
            </div>
          )}
        </div>
      ))}

      {!query.trim() && !adminMode && (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Buscador de Flota</p>
          <p className="text-sm mt-1">Escribe una patente o empresa</p>
          <p className="text-xs mt-3">{state.vehicles.length} vehículos · {state.companies.length} empresas</p>
        </div>
      )}

      {/* Admin toggle */}
      <div className="m3-surface p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Modo Admin</span>
        </div>
        <Switch checked={adminMode} onCheckedChange={setAdminMode} />
      </div>

      {/* Admin panel */}
      {adminMode && (
        <div className="space-y-4 animate-slide-up">
          {/* Add company */}
          <div className="m3-surface p-4 space-y-3">
            <p className="text-sm font-bold text-foreground">Agregar Empresa</p>
            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nombre" className="rounded-2xl bg-secondary border-border" />
            <Input value={companyRut} onChange={e => setCompanyRut(e.target.value)} placeholder="RUT" className="rounded-2xl bg-secondary border-border" />
            <Button onClick={addCompany} className="w-full rounded-3xl"><Plus className="w-4 h-4 mr-1" />Agregar</Button>
          </div>

          {/* Companies list */}
          {state.companies.length > 0 && (
            <div className="m3-surface p-4 space-y-2">
              <p className="text-sm font-bold text-foreground">Empresas ({state.companies.length})</p>
              {state.companies.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.rut || 'Sin RUT'} · {state.vehicles.filter(v => v.companyId === c.id).length} vehículos</p>
                  </div>
                  <button onClick={() => deleteCompany(c.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Bulk vehicle load */}
          {state.companies.length > 0 && (
            <div className="m3-surface p-4 space-y-3">
              <p className="text-sm font-bold text-foreground">Carga Masiva de Patentes</p>
              <div>
                <Label className="text-xs text-muted-foreground">Empresa</Label>
                <select
                  value={bulkCompanyId}
                  onChange={e => setBulkCompanyId(e.target.value)}
                  className="w-full h-10 rounded-2xl bg-secondary border border-border px-3 text-sm text-foreground"
                >
                  <option value="">Seleccionar...</option>
                  {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <select
                  value={bulkType}
                  onChange={e => setBulkType(e.target.value as any)}
                  className="w-full h-10 rounded-2xl bg-secondary border border-border px-3 text-sm text-foreground"
                >
                  <option value="truck">🚛 Camión</option>
                  <option value="car">🚗 Auto</option>
                  <option value="pickup">🛻 Camioneta</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Patentes (una por línea)</Label>
                <textarea
                  value={bulkPlates}
                  onChange={e => setBulkPlates(e.target.value)}
                  placeholder={"ABCD12\nEFGH34\nIJKL56"}
                  rows={5}
                  className="w-full rounded-2xl bg-secondary border border-border px-3 py-2 text-sm text-foreground resize-none"
                />
              </div>
              <Button onClick={addBulkVehicles} className="w-full rounded-3xl" disabled={!bulkCompanyId || !bulkPlates.trim()}>
                <Plus className="w-4 h-4 mr-1" />Cargar Patentes
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
