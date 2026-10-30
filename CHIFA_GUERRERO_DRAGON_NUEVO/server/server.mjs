/**
 * API REST local para Chifa El Guerrero Dragón.
 * Node.js 22+, módulos nativos, sin SQL ni dependencias de terceros.
 * IMPORTANTE: es un entorno de demostración académica; no sustituye un despliegue productivo seguro.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createTransactionalStore, DEMO_USERS, loadState } from './store.mjs';
import {
  DomainError, makeId, recordMovement, createSupplier, createPurchaseOrder,
  receivePurchaseOrder, saveRecipe, createSale, createReturn, supplierScore,
  stockAlerts, kpis, createComplaint, publicTrackComplaint, setOperationalStatus
} from './services.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const store = createTransactionalStore(loadState());
const sessions = new Map();
const loginAttempts = new Map();
const sessionUsers = DEMO_USERS.map((user) => ({
  ...user,
  salt: randomBytes(16),
  hash: null
}));
for (const user of sessionUsers) { user.hash = scryptSync(user.password, user.salt, 64); delete user.password; }

const ROLE = {
  manager: 'Gerente', worker: 'Trabajador', cashier: 'Cajero'
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  });
  res.end(body);
}
function ok(res, data, status = 200) { json(res, status, { success: true, data }); }
function fail(res, error) {
  const status = error instanceof DomainError ? error.status : 500;
  if (status === 500) console.error('[api]', error);
  json(res, status, {
    success: false,
    error: error.message || 'Error interno del servidor.',
    code: error.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR')
  });
}
async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new DomainError('El cuerpo de la solicitud supera el límite de 1 MB.', 413);
  }
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw new DomainError('El cuerpo de la solicitud debe ser JSON válido.'); }
}
function actorFor(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new DomainError('Sesión requerida. Inicie sesión para continuar.', 401, 'AUTH_REQUIRED');
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    throw new DomainError('La sesión expiró. Vuelva a iniciar sesión.', 401, 'SESSION_EXPIRED');
  }
  const user = sessionUsers.find((x) => x.username === session.username);
  if (!user) throw new DomainError('Sesión inválida.', 401, 'INVALID_SESSION');
  return { username: user.username, name: user.name, role: user.role, code: user.code };
}
function requireRoles(actor, allowed) {
  if (!allowed.includes(actor.role)) throw new DomainError('No tiene permisos para realizar esta operación.', 403, 'FORBIDDEN');
}
function logAudit(state, actor, action, entity, entityId, detail = '') {
  state.auditLog.push({ id: makeId('AUD'), date: new Date().toISOString(), actor: actor.name, role: actor.role, action, entity, entityId, detail });
  if (state.auditLog.length > 1000) state.auditLog.splice(0, state.auditLog.length - 1000);
}
function parseDate(value, fallback) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

async function api(req, res, url) {
  const method = req.method || 'GET';
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  if (method === 'GET' && pathname === '/api/health') {
    return ok(res, { status: 'UP', service: 'chifa-guerrero-api', storage: 'local-json', version: '1.0.0' });
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const body = await readBody(req);
    const username = String(body.username || '').trim();
    const key = `${req.socket.remoteAddress || 'local'}:${username.toLowerCase()}`;
    const windowMs = 15 * 60 * 1000;
    const attempt = loginAttempts.get(key);
    if (attempt && attempt.expiresAt > Date.now() && attempt.count >= 5) {
      throw new DomainError('Demasiados intentos fallidos. Espere 15 minutos antes de volver a intentar.', 429, 'LOGIN_RATE_LIMIT');
    }
    const candidate = sessionUsers.find((x) => x.username === username);
    const submitted = scryptSync(String(body.password || ''), candidate?.salt || Buffer.alloc(16), 64);
    const valid = Boolean(candidate && timingSafeEqual(candidate.hash, submitted));
    if (!valid) {
      const next = attempt && attempt.expiresAt > Date.now() ? attempt : { count: 0, expiresAt: Date.now() + windowMs };
      next.count += 1;
      loginAttempts.set(key, next);
      throw new DomainError('Usuario o contraseña incorrectos.', 401, 'INVALID_CREDENTIALS');
    }
    loginAttempts.delete(key);
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { username: candidate.username, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return ok(res, { token, expiresIn: 28800, user: { username: candidate.username, name: candidate.name, role: candidate.role, code: candidate.code } });
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    sessions.delete(token);
    return ok(res, { loggedOut: true });
  }

  if (method === 'POST' && pathname === '/api/public/complaints') {
    const body = await readBody(req);
    const record = await store.transaction((state) => createComplaint(state, body));
    return ok(res, { id: record.id, trackingCode: record.trackingCode, date: record.date, status: record.status }, 201);
  }

  if (method === 'GET' && pathname === '/api/public/complaints/track') {
    const result = publicTrackComplaint(store.read(), url.searchParams.get('id') || '', url.searchParams.get('code') || '');
    return ok(res, result);
  }

  const actor = actorFor(req);
  if (method === 'GET' && pathname === '/api/auth/me') {
    return ok(res, { username: actor.username, name: actor.name, role: actor.role, code: actor.code });
  }

  if (method === 'GET' && pathname === '/api/overview') {
    requireRoles(actor, [ROLE.manager, ROLE.worker, ROLE.cashier]);
    const state = store.read();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const todayKpis = kpis(state, today, today);
    const alerts = stockAlerts(state);
    return ok(res, {
      today: todayKpis,
      inventoryValue: round(todayKpis.inventoryValue),
      stockAlerts: alerts,
      purchaseOrdersPending: state.purchaseOrders.filter((x) => x.status === 'Emitida').length,
      pendingIncidents: state.incidents.filter((x) => x.status !== 'Atendida').length,
      pendingRequests: state.requests.filter((x) => x.status === 'Pendiente').length,
      pendingComplaints: state.complaints.filter((x) => !['Atendido', 'No procede'].includes(x.status)).length,
      recentKardex: state.kardex.slice(-8).reverse(),
      recentSales: state.sales.slice(-5).reverse()
    });
  }

  if (method === 'GET' && pathname === '/api/items') {
    requireRoles(actor, [ROLE.manager, ROLE.worker, ROLE.cashier]);
    const search = (url.searchParams.get('search') || '').toLocaleLowerCase('es-PE');
    const items = store.read().items.filter((x) => !search || [x.name, x.sku, x.category].some((v) => v.toLocaleLowerCase('es-PE').includes(search)));
    return ok(res, items);
  }

  if (method === 'GET' && pathname === '/api/alerts') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    return ok(res, stockAlerts(store.read()));
  }

  if (method === 'POST' && pathname === '/api/kardex') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    const body = await readBody(req);
    const result = await store.transaction((state) => {
      const movement = recordMovement(state, body, actor);
      logAudit(state, actor, body.type, 'KARDEX', movement.movement.id, body.reason || '');
      return movement;
    });
    return ok(res, result, 201);
  }

  if (method === 'GET' && pathname === '/api/kardex') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    const { itemId, type, from, to } = Object.fromEntries(url.searchParams);
    const records = store.read().kardex.filter((x) => (!itemId || x.itemId === itemId)
      && (!type || x.type === type)
      && (!from || x.date.slice(0, 10) >= from)
      && (!to || x.date.slice(0, 10) <= to));
    return ok(res, records.slice().reverse());
  }

  if (method === 'GET' && pathname === '/api/suppliers') {
    requireRoles(actor, [ROLE.manager]);
    return ok(res, store.read().suppliers.map((x) => ({ ...x, score: supplierScore(x) })));
  }

  if (method === 'POST' && pathname === '/api/suppliers') {
    requireRoles(actor, [ROLE.manager]);
    const body = await readBody(req);
    const supplier = await store.transaction((state) => {
      const result = createSupplier(state, body);
      logAudit(state, actor, 'CREAR', 'PROVEEDOR', result.id, result.businessName);
      return result;
    });
    return ok(res, { ...supplier, score: null }, 201);
  }

  if (method === 'GET' && pathname === '/api/purchase-orders') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    return ok(res, store.read().purchaseOrders.slice().reverse());
  }

  if (method === 'POST' && pathname === '/api/purchase-orders') {
    requireRoles(actor, [ROLE.manager]);
    const body = await readBody(req);
    const order = await store.transaction((state) => {
      const result = createPurchaseOrder(state, body, actor);
      logAudit(state, actor, 'EMITIR', 'ORDEN_COMPRA', result.id, `Total S/ ${result.total.toFixed(2)}`);
      return result;
    });
    return ok(res, order, 201);
  }

  const receiveMatch = pathname.match(/^\/api\/purchase-orders\/([^/]+)\/receive$/);
  if (method === 'POST' && receiveMatch) {
    requireRoles(actor, [ROLE.manager]);
    const orderId = decodeURIComponent(receiveMatch[1]);
    const order = await store.transaction((state) => {
      const result = receivePurchaseOrder(state, orderId, actor);
      logAudit(state, actor, 'RECIBIR', 'ORDEN_COMPRA', result.id, 'Entrada de stock registrada en Kardex');
      return result;
    });
    return ok(res, order);
  }

  if (method === 'GET' && pathname === '/api/recipes') {
    requireRoles(actor, [ROLE.manager, ROLE.worker, ROLE.cashier]);
    const state = store.read();
    return ok(res, state.recipes.filter((x) => x.active !== false).map((recipe) => ({
      ...recipe,
      estimatedCost: round(recipe.ingredients.reduce((sum, line) => {
        const item = state.items.find((x) => x.id === line.itemId);
        return sum + (item ? item.unitCost * line.qty : 0);
      }, 0))
    })));
  }

  if (method === 'POST' && pathname === '/api/recipes') {
    requireRoles(actor, [ROLE.manager]);
    const body = await readBody(req);
    const recipe = await store.transaction((state) => {
      const result = saveRecipe(state, body);
      logAudit(state, actor, 'CREAR', 'RECETA', result.id, result.name);
      return result;
    });
    return ok(res, recipe, 201);
  }

  const recipeMatch = pathname.match(/^\/api\/recipes\/([^/]+)$/);
  if (method === 'PUT' && recipeMatch) {
    requireRoles(actor, [ROLE.manager]);
    const body = await readBody(req);
    const id = decodeURIComponent(recipeMatch[1]);
    const recipe = await store.transaction((state) => {
      const result = saveRecipe(state, body, id);
      logAudit(state, actor, 'ACTUALIZAR', 'RECETA', result.id, result.name);
      return result;
    });
    return ok(res, recipe);
  }

  if (method === 'GET' && pathname === '/api/returns') {
    requireRoles(actor, [ROLE.manager]);
    return ok(res, store.read().returns.slice().reverse());
  }

  if (method === 'POST' && pathname === '/api/returns') {
    requireRoles(actor, [ROLE.manager]);
    const body = await readBody(req);
    const record = await store.transaction((state) => {
      const result = createReturn(state, body, actor);
      logAudit(state, actor, 'REGISTRAR', 'DEVOLUCION_MERMA', result.id, result.reason);
      return result;
    });
    return ok(res, record, 201);
  }

  if (method === 'GET' && pathname === '/api/kpis') {
    requireRoles(actor, [ROLE.manager]);
    return ok(res, kpis(store.read(), parseDate(url.searchParams.get('from'), ''), parseDate(url.searchParams.get('to'), '')));
  }

  if (method === 'GET' && pathname === '/api/sales') {
    requireRoles(actor, [ROLE.manager, ROLE.cashier]);
    return ok(res, store.read().sales.slice().reverse());
  }

  if (method === 'POST' && pathname === '/api/sales') {
    requireRoles(actor, [ROLE.manager, ROLE.cashier]);
    const body = await readBody(req);
    const sale = await store.transaction((state) => {
      const result = createSale(state, body, actor);
      logAudit(state, actor, 'REGISTRAR', 'VENTA', result.id, `Total S/ ${result.total.toFixed(2)}`);
      return result;
    });
    return ok(res, sale, 201);
  }

  if (method === 'GET' && pathname === '/api/incidents') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    return ok(res, store.read().incidents.slice().reverse());
  }
  if (method === 'POST' && pathname === '/api/incidents') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    const body = await readBody(req);
    const result = await store.transaction((state) => {
      const incident = { id: makeId('INC'), date: new Date().toISOString(), category: String(body.category || 'Otros').slice(0, 60), title: String(body.title || '').trim().slice(0, 120), detail: String(body.detail || '').trim().slice(0, 1000), priority: ['Baja', 'Media', 'Alta'].includes(body.priority) ? body.priority : 'Media', status: 'Pendiente', createdBy: actor.name };
      if (!incident.title || !incident.detail) throw new DomainError('Título y detalle son obligatorios.');
      state.incidents.push(incident); logAudit(state, actor, 'CREAR', 'INCIDENCIA', incident.id, incident.title); return incident;
    });
    return ok(res, result, 201);
  }

  if (method === 'GET' && pathname === '/api/stock-reports') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    return ok(res, store.read().stockReports.slice().reverse());
  }
  if (method === 'POST' && pathname === '/api/stock-reports') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    const body = await readBody(req);
    const result = await store.transaction((state) => {
      const item = state.items.find((x) => x.id === body.itemId);
      if (!item) throw new DomainError('Insumo no encontrado.', 404);
      const report = { id: makeId('DES'), date: new Date().toISOString(), itemId: item.id, itemName: item.name, quantity: Math.max(0, Number(body.quantity) || 0), priority: ['Baja', 'Media', 'Alta'].includes(body.priority) ? body.priority : 'Media', status: 'Pendiente', createdBy: actor.name, detail: String(body.detail || '').trim().slice(0, 800) };
      state.stockReports.push(report); return report;
    });
    return ok(res, result, 201);
  }

  if (method === 'GET' && pathname === '/api/requests') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    const records = store.read().requests;
    return ok(res, actor.role === ROLE.manager ? records.slice().reverse() : records.filter((x) => x.createdBy === actor.name).slice().reverse());
  }
  if (method === 'POST' && pathname === '/api/requests') {
    requireRoles(actor, [ROLE.manager, ROLE.worker]);
    const body = await readBody(req);
    const result = await store.transaction((state) => {
      const request = { id: makeId('SOL'), date: new Date().toISOString(), type: String(body.type || 'Otro').slice(0, 80), requestedDate: String(body.requestedDate || '').slice(0, 10), detail: String(body.detail || '').trim().slice(0, 1000), status: 'Pendiente', createdBy: actor.name };
      if (!request.detail || !request.requestedDate) throw new DomainError('Fecha solicitada y detalle son obligatorios.');
      state.requests.push(request); return request;
    });
    return ok(res, result, 201);
  }

  if (method === 'GET' && pathname === '/api/complaints') {
    requireRoles(actor, [ROLE.manager]);
    return ok(res, store.read().complaints.slice().reverse());
  }

  const stateMatch = pathname.match(/^\/api\/(incidents|stock-reports|requests|complaints)\/([^/]+)\/status$/);
  if (method === 'PATCH' && stateMatch) {
    const collection = ({ 'incidents': 'incidents', 'stock-reports': 'stockReports', requests: 'requests', complaints: 'complaints' })[stateMatch[1]];
    if (collection === 'requests' || collection === 'complaints') requireRoles(actor, [ROLE.manager]);
    else requireRoles(actor, [ROLE.manager, ROLE.worker]);
    const body = await readBody(req);
    const record = await store.transaction((state) => {
      const result = setOperationalStatus(state, collection, decodeURIComponent(stateMatch[2]), body.status, body.response);
      logAudit(state, actor, 'CAMBIAR_ESTADO', collection.toUpperCase(), result.id, result.status);
      return result;
    });
    return ok(res, record);
  }

  if (method === 'GET' && pathname === '/api/audit') {
    requireRoles(actor, [ROLE.manager]);
    return ok(res, store.read().auditLog.slice().reverse().slice(0, 150));
  }

  return json(res, 404, { success: false, error: 'Ruta API no encontrada.', code: 'NOT_FOUND' });
}
function round(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }

async function serveStatic(req, res, url) {
  let requested = decodeURIComponent(url.pathname);
  if (requested === '/') requested = '/index.html';
  const filePath = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403); return res.end('Forbidden');
  }
  let actual = filePath;
  try {
    const stat = fs.statSync(actual);
    if (stat.isDirectory()) actual = path.join(actual, 'index.html');
    const contents = fs.readFileSync(actual);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(actual).toLowerCase()] || 'application/octet-stream',
      'Content-Length': contents.length,
      'Cache-Control': path.extname(actual) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    res.end(contents);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    fail(res, error);
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  CHIFA EL GUERRERO DRAGÓN · SISTEMA LOCAL');
  console.log(`  Aplicación: http://${HOST}:${PORT}`);
  console.log(`  API:        http://${HOST}:${PORT}/api/health`);
  console.log('  Datos:      data/state.json (local, sin SQL)');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\nCerrando servidor local...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
