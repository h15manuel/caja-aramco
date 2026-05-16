import { useState } from 'react';
import { Cloud, CloudOff, Copy, Eye, LogIn, LogOut, RefreshCw, UserPlus, Wifi, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSyncCtx } from '@/contexts/SyncContext';
import type { RemoteUser } from '@/hooks/useSync';
import { toast } from 'sonner';
import { formatCLP } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SyncSettings() {
  const {
    config, registerUser, openShift, joinShift, leaveShift,
    remoteUsers, lastError, busy,
  } = useSyncCtx();

  const [userDraft, setUserDraft] = useState(config.username);
  const [joinCode, setJoinCode] = useState('');

  const handleRegister = async () => {
    const u = userDraft.trim();
    if (!u) { toast.error('Escribe un nombre de usuario'); return; }
    const ok = await registerUser(u);
    if (ok) toast.success(`Usuario "${u.toLowerCase()}" listo`);
    else toast.error(lastError || 'No se pudo registrar');
  };

  const handleOpen = async () => {
    const code = await openShift();
    if (code) toast.success(`Turno abierto. Código: ${code}`);
    else toast.error(lastError || 'No se pudo abrir el turno');
  };

  const handleJoin = async () => {
    const ok = await joinShift(joinCode);
    if (ok) {
      toast.success('Conectado al turno');
      setJoinCode('');
    } else {
      toast.error(lastError || 'No se pudo unir');
    }
  };

  const handleLeave = async () => {
    await leaveShift();
    toast.success('Saliste del turno');
  };

  const copyCode = () => {
    if (!config.code) return;
    navigator.clipboard.writeText(config.code).then(() => toast.success('Código copiado'));
  };

  const inSession = config.role !== 'idle';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {inSession ? <Cloud className="w-5 h-5 text-primary" /> : <CloudOff className="w-5 h-5 text-muted-foreground" />}
        <h2 className="text-lg font-semibold">Sincronización</h2>
      </div>

      <p className="text-[11px] text-muted-foreground -mt-2">
        Sincronización en tiempo real. Sin configuración: solo elige un nombre y abre o únete a un turno con un código de 6 dígitos.
      </p>

      {/* 1. Nombre de usuario */}
      <div className="space-y-1.5">
        <Label htmlFor="sync-user">Tu nombre de usuario</Label>
        <div className="flex gap-2">
          <Input
            id="sync-user"
            placeholder="ej. juan"
            value={userDraft}
            onChange={e => setUserDraft(e.target.value)}
            disabled={inSession}
            className="flex-1"
          />
          <Button onClick={handleRegister} disabled={busy || inSession}>
            <UserPlus className="w-4 h-4 mr-1" /> Guardar
          </Button>
        </div>
        {config.username && (
          <p className="text-[11px] text-muted-foreground">
            Conectado como <span className="font-semibold text-foreground">{config.username}</span>
          </p>
        )}
      </div>

      {/* 2. Turno */}
      {!inSession ? (
        <div className="grid gap-3">
          <Button onClick={handleOpen} disabled={busy || !config.username}>
            Abrir turno (host)
          </Button>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="Código de 6 dígitos"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="flex-1"
            />
            <Button onClick={handleJoin} disabled={busy || joinCode.length !== 6 || !config.username} variant="secondary">
              <LogIn className="w-4 h-4 mr-1" /> Unirse
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {config.role === 'host' ? 'Eres el host' : `Invitado · host: ${config.hostUsername}`}
              </p>
              <p className="text-2xl font-bold text-primary tracking-widest">{config.code}</p>
            </div>
            <div className="flex gap-1">
              <Button onClick={copyCode} size="icon" variant="ghost"><Copy className="w-4 h-4" /></Button>
              <Button onClick={handleLeave} size="icon" variant="ghost" title="Salir del turno">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="border-t border-primary/20 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
              <RefreshCw className="w-3 h-3" />
              <span>Personas en este turno ({remoteUsers.length})</span>
            </div>
            <ul className="space-y-1">
              {remoteUsers.map(u => {
                const isMe = u.username === config.username;
                return (
                  <li key={u.username} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <Wifi
                        className={`w-3.5 h-3.5 ${u.online ? 'text-green-500' : 'text-muted-foreground/40'}`}
                      />
                      <span className={isMe ? 'font-semibold' : ''}>{u.username}</span>
                      {u.isHost && <span className="text-[9px] uppercase text-primary">host</span>}
                      {isMe && <span className="text-[9px] uppercase text-muted-foreground">(tú)</span>}
                      {!isMe && (
                        <span className={`text-[9px] uppercase ${u.online ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {u.online ? 'online' : 'offline'}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatCLP(u.totals.efectivoReal)}
                    </span>
                  </li>
                );
              })}
              {remoteUsers.length === 0 && (
                <li className="text-xs text-muted-foreground italic">Aún no hay datos…</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {lastError && (
        <p className="text-[11px] text-destructive">⚠ {lastError}</p>
      )}
    </div>
  );
}
