/**
 * ============================================================================
 *  Caja Control — Google Apps Script backend
 * ============================================================================
 *  Cómo usar:
 *    1. Crea una nueva hoja de cálculo en Google Sheets.
 *    2. Extensiones → Apps Script. Borra el contenido y pega TODO este archivo.
 *    3. En el editor: Implementar → Nueva implementación → Tipo: "Aplicación web".
 *         - Ejecutar como: yo
 *         - Quién tiene acceso: cualquiera (necesario para que la app la llame)
 *    4. Copia la URL que termina en /exec y pégala en la app
 *       (Configuración → Sincronización → URL del Apps Script).
 *
 *  Las hojas (Users, Shifts, Totals) se crean automáticamente en la primera
 *  llamada. No hace falta que prepares nada en el Sheet.
 *
 *  Contrato (POST application/json o GET con ?action=...):
 *    - registerUser  { username }                  → { ok, user }
 *    - openShift     { username }                  → { ok, code, shiftId }
 *    - joinShift     { username, code }            → { ok, shiftId, hostUsername }
 *    - leaveShift    { username, code }            → { ok }
 *    - pushTotals    { username, code, totals }    → { ok }
 *        totals = { zAmount, tipsTotal, cashDrawer, depositsTotal,
 *                   meta, efectivoReal, diferencia, status }
 *    - pullTotals    { code, username }            → { ok, users: [{username, isHost,
 *                                                       online, lastSeen, totals}] }
 *    - closeShift    { username, code }            → { ok }    (solo el host)
 *
 *  Heartbeat: la app llama pullTotals cada ~10s; se considera online si
 *  lastSeen < ONLINE_TTL_SECONDS.
 * ============================================================================
 */

const ONLINE_TTL_SECONDS = 30; // si no hubo push/pull en 30s → offline
const CODE_TTL_HOURS = 24;     // los turnos se autoexpiran luego de 24h

// ---------- entry points ----------------------------------------------------

function doGet(e) {
  return handle_(e.parameter || {});
}

function doPost(e) {
  let body = {};
  try {
    // Preferido: cliente envía application/x-www-form-urlencoded con
    // payload=<json> (evita preflight y problemas de redirect CORS).
    if (e.parameter && e.parameter.payload) {
      body = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      // Fallback: body JSON crudo (text/plain o application/json)
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return json_({ ok: false, error: 'invalid_json' });
  }
  return handle_(body);
}

function handle_(p) {
  try {
    const action = String(p.action || '').trim();
    switch (action) {
      case 'registerUser': return json_(registerUser_(p));
      case 'openShift':    return json_(openShift_(p));
      case 'joinShift':    return json_(joinShift_(p));
      case 'leaveShift':   return json_(leaveShift_(p));
      case 'pushTotals':   return json_(pushTotals_(p));
      case 'pullTotals':   return json_(pullTotals_(p));
      case 'closeShift':   return json_(closeShift_(p));
      case 'ping':         return json_({ ok: true, time: new Date().toISOString() });
      default:             return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- sheets ----------------------------------------------------------

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function usersSheet_()  { return sheet_('Users',  ['username', 'createdAt']); }
function shiftsSheet_() { return sheet_('Shifts', ['code', 'shiftId', 'hostUsername', 'createdAt', 'closed']); }
function totalsSheet_() {
  return sheet_('Totals', [
    'code', 'username', 'isHost', 'lastSeen',
    'zAmount', 'tipsTotal', 'cashDrawer', 'depositsTotal',
    'meta', 'efectivoReal', 'diferencia', 'status',
  ]);
}

function readAll_(sh) {
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const o = {};
    headers.forEach((h, i) => { o[h] = row[i]; });
    return o;
  });
}

function findRow_(sh, predicate) {
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return -1;
  const headers = values[0];
  for (let i = 1; i < values.length; i++) {
    const o = {};
    headers.forEach((h, j) => { o[h] = values[i][j]; });
    if (predicate(o)) return i + 1; // 1-based row index
  }
  return -1;
}

// ---------- helpers ---------------------------------------------------------

function nowIso_() { return new Date().toISOString(); }

function normUser_(u) {
  return String(u || '').trim().toLowerCase();
}

function genCode_() {
  // 6 dígitos numéricos
  return String(Math.floor(100000 + Math.random() * 900000));
}

function requireString_(v, name) {
  const s = String(v == null ? '' : v).trim();
  if (!s) throw new Error('missing_' + name);
  return s;
}

function activeShift_(code) {
  const sh = shiftsSheet_();
  const rows = readAll_(sh);
  return rows.find(r => String(r.code) === String(code) && !r.closed);
}

// ---------- actions ---------------------------------------------------------

function registerUser_(p) {
  const username = normUser_(requireString_(p.username, 'username'));
  const sh = usersSheet_();
  const existing = readAll_(sh).find(r => normUser_(r.username) === username);
  if (existing) return { ok: true, user: { username }, existed: true };
  sh.appendRow([username, nowIso_()]);
  return { ok: true, user: { username }, existed: false };
}

function openShift_(p) {
  const username = normUser_(requireString_(p.username, 'username'));
  // asegurarse de que el usuario exista
  registerUser_({ username });

  const code = genCode_();
  const shiftId = Utilities.getUuid();
  shiftsSheet_().appendRow([code, shiftId, username, nowIso_(), false]);

  // host se inscribe en Totals
  totalsSheet_().appendRow([
    code, username, true, nowIso_(),
    0, 0, 0, 0, 0, 0, 0, 'cuadrada',
  ]);
  return { ok: true, code, shiftId };
}

function joinShift_(p) {
  const username = normUser_(requireString_(p.username, 'username'));
  const code = requireString_(p.code, 'code');
  registerUser_({ username });

  const shift = activeShift_(code);
  if (!shift) return { ok: false, error: 'invalid_code' };

  // ¿ya está en este turno? sólo refrescamos lastSeen
  const tSh = totalsSheet_();
  const row = findRow_(tSh, r => String(r.code) === String(code) && normUser_(r.username) === username);
  if (row > 0) {
    tSh.getRange(row, 4).setValue(nowIso_());
  } else {
    tSh.appendRow([code, username, false, nowIso_(), 0, 0, 0, 0, 0, 0, 0, 'cuadrada']);
  }
  return { ok: true, shiftId: shift.shiftId, hostUsername: shift.hostUsername };
}

function leaveShift_(p) {
  const username = normUser_(requireString_(p.username, 'username'));
  const code = requireString_(p.code, 'code');
  const tSh = totalsSheet_();
  const row = findRow_(tSh, r => String(r.code) === String(code) && normUser_(r.username) === username);
  if (row > 0) tSh.deleteRow(row);
  return { ok: true };
}

function pushTotals_(p) {
  const username = normUser_(requireString_(p.username, 'username'));
  const code = requireString_(p.code, 'code');
  const t = p.totals || {};

  const shift = activeShift_(code);
  if (!shift) return { ok: false, error: 'invalid_code' };

  const tSh = totalsSheet_();
  const row = findRow_(tSh, r => String(r.code) === String(code) && normUser_(r.username) === username);
  const isHost = normUser_(shift.hostUsername) === username;

  const values = [
    code, username, isHost, nowIso_(),
    Number(t.zAmount       || 0),
    Number(t.tipsTotal     || 0),
    Number(t.cashDrawer    || 0),
    Number(t.depositsTotal || 0),
    Number(t.meta          || 0),
    Number(t.efectivoReal  || 0),
    Number(t.diferencia    || 0),
    String(t.status        || 'cuadrada'),
  ];
  if (row > 0) {
    tSh.getRange(row, 1, 1, values.length).setValues([values]);
  } else {
    tSh.appendRow(values);
  }
  return { ok: true };
}

function pullTotals_(p) {
  const code = requireString_(p.code, 'code');
  const me = normUser_(p.username || '');

  // marca lastSeen del que pregunta (es como un heartbeat barato)
  if (me) {
    const tSh = totalsSheet_();
    const row = findRow_(tSh, r => String(r.code) === String(code) && normUser_(r.username) === me);
    if (row > 0) tSh.getRange(row, 4).setValue(nowIso_());
  }

  const shift = activeShift_(code);
  if (!shift) return { ok: false, error: 'invalid_code' };

  const rows = readAll_(totalsSheet_()).filter(r => String(r.code) === String(code));
  const now = Date.now();
  const users = rows.map(r => {
    const lastSeenMs = new Date(r.lastSeen).getTime();
    const online = isFinite(lastSeenMs) && (now - lastSeenMs) < ONLINE_TTL_SECONDS * 1000;
    return {
      username: r.username,
      isHost: !!r.isHost,
      online,
      lastSeen: r.lastSeen,
      totals: {
        zAmount:       Number(r.zAmount       || 0),
        tipsTotal:     Number(r.tipsTotal     || 0),
        cashDrawer:    Number(r.cashDrawer    || 0),
        depositsTotal: Number(r.depositsTotal || 0),
        meta:          Number(r.meta          || 0),
        efectivoReal:  Number(r.efectivoReal  || 0),
        diferencia:    Number(r.diferencia    || 0),
        status:        String(r.status        || 'cuadrada'),
      },
    };
  });
  return { ok: true, hostUsername: shift.hostUsername, users };
}

function closeShift_(p) {
  const username = normUser_(requireString_(p.username, 'username'));
  const code = requireString_(p.code, 'code');
  const shift = activeShift_(code);
  if (!shift) return { ok: false, error: 'invalid_code' };
  if (normUser_(shift.hostUsername) !== username) return { ok: false, error: 'not_host' };

  const sh = shiftsSheet_();
  const row = findRow_(sh, r => String(r.code) === String(code) && !r.closed);
  if (row > 0) sh.getRange(row, 5).setValue(true);

  // limpiar totales del turno
  const tSh = totalsSheet_();
  const data = tSh.getDataRange().getValues();
  for (let i = data.length; i >= 2; i--) {
    if (String(data[i - 1][0]) === String(code)) tSh.deleteRow(i);
  }
  return { ok: true };
}

// ---------- mantenimiento (opcional, ejecuta a mano si quieres limpiar) ----

function purgeOldShifts() {
  const cutoff = Date.now() - CODE_TTL_HOURS * 3600 * 1000;
  const sh = shiftsSheet_();
  const data = sh.getDataRange().getValues();
  for (let i = data.length; i >= 2; i--) {
    const created = new Date(data[i - 1][3]).getTime();
    if (isFinite(created) && created < cutoff) sh.deleteRow(i);
  }
}
