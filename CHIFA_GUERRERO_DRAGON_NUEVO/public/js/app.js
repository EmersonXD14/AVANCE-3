import { api, session, ApiError } from './api.js';

const app = document.querySelector('#app');
const toastRegion = document.querySelector('#toast-region');
const ROLE = { manager: 'Gerente', worker: 'Trabajador', cashier: 'Cajero' };
const state = { user: null, view: 'dashboard', cart: [], lastSale: null, inventory: [], suppliers: [], items: [], recipes: [], alertCount: 0, lastAlertIds: null };
let alertMonitor = null;

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  boxes: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  truck: '<path d="M3 6h12v12H3zM15 10h4l3 3v5h-7z"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="18.5" cy="18" r="1.8"/>',
  receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  chef: '<path d="M6 10a4 4 0 1 1 7.2-2.4A4.5 4.5 0 1 1 18 14H6a4 4 0 0 1 0-8"/><path d="M6 14v6h12v-6M9 17h6"/>',
  alert: '<path d="m12 3 9 17H3L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"/>',
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  cash: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h.01M6 12h.01M12 9v6M9 12h6"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM18 12h.01"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/>',
  package: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z"/><path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.5 10.5a6 6 0 1 1-8 8M8 5v6M5.5 8h5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10Z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>'
};
const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.file}</svg>`;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
const number = (value, digits = 2) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: digits }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const dateShort = (value) => value ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(new Date(value)) : '—';
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const initials = (name) => String(name || 'GD').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const statusClass = (status) => {
  const value = String(status || '').toLowerCase();
  if (['crítica', 'rechazada', 'no procede'].includes(value)) return 'pill-critical';
  if (['pendiente', 'emitida', 'en revisión', 'en atención', 'registrado'].includes(value)) return 'pill-warning';
  if (['recibida', 'atendida', 'atendido', 'aprobada'].includes(value)) return 'pill-success';
  if (['aprobada', 'yape / plin', 'tarjeta'].includes(value)) return 'pill-info';
  return 'pill-neutral';
};
const pill = (value) => `<span class="pill ${statusClass(value)}">${esc(value)}</span>`;
const pageHeading = (eyebrow, title, description, actions = '') => `
  <div class="page-heading"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
const panelHead = (title, subtitle = '', action = '') => `<div class="panel-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>`;
const empty = (title, description) => `<div class="empty-state"><strong>${esc(title)}</strong>${esc(description)}</div>`;
const field = (name, label, type = 'text', value = '', options = {}) => {
  const { required = true, min = '', step = '', placeholder = '', hint = '', className = '', max = '' } = options;
  const attr = type === 'select' ? '' : `type="${type}"`;
  return `<div class="field ${className}"><label for="${esc(name)}">${esc(label)}</label>${type === 'textarea'
    ? `<textarea id="${esc(name)}" name="${esc(name)}" ${required ? 'required' : ''} placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
    : `<input id="${esc(name)}" name="${esc(name)}" ${attr} value="${esc(value)}" ${required ? 'required' : ''} ${min !== '' ? `min="${min}"` : ''} ${max !== '' ? `max="${max}"` : ''} ${step !== '' ? `step="${step}"` : ''} placeholder="${esc(placeholder)}">`}${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
};
const selectField = (name, label, options, selected = '', required = true, className = '') => `<div class="field ${className}"><label for="${esc(name)}">${esc(label)}</label><select id="${esc(name)}" name="${esc(name)}" ${required ? 'required' : ''}>${options.map((opt) => `<option value="${esc(opt.value)}" ${String(opt.value) === String(selected) ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}</select></div>`;

const navGroups = [
  { label: 'Visión general', links: [{ id: 'dashboard', label: 'Panel principal', icon: 'grid', roles: [ROLE.manager, ROLE.worker, ROLE.cashier] }] },
  { label: 'Abastecimiento', links: [
    { id: 'inventory', label: 'Inventario', icon: 'boxes', roles: [ROLE.manager, ROLE.worker] },
    { id: 'kardex', label: 'Kardex transaccional', icon: 'list', roles: [ROLE.manager, ROLE.worker] },
    { id: 'suppliers', label: 'Proveedores', icon: 'truck', roles: [ROLE.manager] },
    { id: 'purchases', label: 'Órdenes de compra', icon: 'receipt', roles: [ROLE.manager] },
    { id: 'recipes', label: 'Recetas y escandallo', icon: 'chef', roles: [ROLE.manager, ROLE.cashier] },
    { id: 'alerts', label: 'Alertas de stock', icon: 'alert', roles: [ROLE.manager, ROLE.worker] },
    { id: 'returns', label: 'Mermas y devoluciones', icon: 'package', roles: [ROLE.manager] }
  ] },
  { label: 'Operaciones', links: [
    { id: 'pos', label: 'Caja y ventas', icon: 'cash', roles: [ROLE.manager, ROLE.cashier] },
    { id: 'incidents', label: 'Incidencias', icon: 'alert', roles: [ROLE.manager, ROLE.worker] },
    { id: 'stockReports', label: 'Desabastecimiento', icon: 'boxes', roles: [ROLE.manager, ROLE.worker] },
    { id: 'requests', label: 'Solicitudes de personal', icon: 'users', roles: [ROLE.manager, ROLE.worker] },
    { id: 'complaints', label: 'Reclamos de clientes', icon: 'message', roles: [ROLE.manager] }
  ] },
  { label: 'Análisis y control', links: [
    { id: 'kpis', label: 'KPIs gerenciales', icon: 'chart', roles: [ROLE.manager] },
    { id: 'audit', label: 'Bitácora del sistema', icon: 'shield', roles: [ROLE.manager] }
  ] }
];
const viewMeta = {
  dashboard: ['Resumen ejecutivo', 'Panel principal', 'Seguimiento integral de la operación y sus indicadores.'],
  inventory: ['Almacén e inventario', 'Control de inventario', 'Consulta de existencias, costos y puntos de reposición.'],
  kardex: ['Trazabilidad', 'Kardex transaccional', 'Historial cronológico de entradas y salidas por insumo.'],
  suppliers: ['Abastecimiento', 'Gestión de proveedores', 'Registro, validación de RUC y evaluación ponderada del servicio.'],
  purchases: ['Abastecimiento', 'Órdenes de compra', 'Emisión de órdenes con subtotal, IGV y recepción atómica de mercancía.'],
  recipes: ['Costeo y producción', 'Recetas y escandallo', 'Composición de insumos por plato y costo estimado de producción.'],
  alerts: ['Monitoreo de almacén', 'Alertas de stock mínimo', 'Detección automática de insumos iguales o inferiores al umbral mínimo.'],
  returns: ['Control de calidad', 'Mermas y devoluciones', 'Registro de lotes defectuosos y evaluación de desempeño del proveedor.'],
  pos: ['Punto de venta', 'Caja y ventas', 'Registro de pedidos, cálculo de importes y descuento automático de almacén.'],
  incidents: ['Continuidad operativa', 'Incidencias', 'Registro y seguimiento de equipos e infraestructura.'],
  stockReports: ['Continuidad operativa', 'Reportes de desabastecimiento', 'Comunicación de faltantes y necesidades de reposición.'],
  requests: ['Gestión de personas', 'Solicitudes de personal', 'Flujos internos de permiso, vacaciones y requerimientos.'],
  complaints: ['Atención al cliente', 'Reclamos y quejas', 'Seguimiento, respuesta y resolución de casos públicos.'],
  kpis: ['Inteligencia de negocio', 'KPIs gerenciales', 'Métricas financieras y operativas filtradas por periodo.'],
  audit: ['Gobierno y control', 'Bitácora del sistema', 'Registro de operaciones relevantes realizadas por usuarios autenticados.']
};

function toast(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.innerHTML = `<span class="toast-mark"></span><span>${esc(message)}</span>`;
  toastRegion.append(node);
  setTimeout(() => node.remove(), 4300);
}
function showError(error) { toast(error instanceof Error ? error.message : String(error), 'error'); }
function actionButton(label, action, style = 'btn-secondary', extra = '') { return `<button class="btn ${style}" type="button" data-action="${esc(action)}" ${extra}>${esc(label)}</button>`; }

function renderLanding() {
  app.innerHTML = `
    <div class="public-shell">
      <header class="public-nav"><a href="#home" class="auth-brand"><span class="brand-seal">GD</span><span><b class="brand-name">EL GUERRERO DRAGÓN</b><small class="brand-caption">Chifa · cocina y tradición</small></span></a><nav class="public-nav-links"><a href="#menu">Carta</a><a href="#experiencia">Nuestra atención</a><button class="btn btn-small" type="button" data-action="go-login">Acceso al sistema</button></nav></header>
      <section class="public-hero"><div class="public-hero-copy"><span class="eyebrow">Tradición · sabor · servicio</span><h1>El auténtico sabor chifa, preparado para compartir.</h1><p>Wok encendido, ingredientes frescos y recetas que reúnen generaciones. Descubre nuestros platos favoritos y disfruta una atención cercana en cada visita.</p><div class="public-hero-actions"><a class="btn btn-primary" href="#menu">Explorar la carta ${icon('arrow')}</a><button class="btn btn-outline" data-action="public-complaint" type="button">Registrar un reclamo</button></div><div class="hero-trust"><span>Ingredientes seleccionados</span><i></i><span>Preparación al momento</span></div></div><div class="public-visual"><img class="hero-food-photo" src="/assets/chaufa.jpg" alt="Plato de arroz chaufa recién preparado" loading="eager"><div class="photo-caption"><small>EL FAVORITO DE LA CASA</small><b>Chaufa del Guerrero</b></div></div></section>
      <section class="public-section" id="menu"><div class="public-section-head"><div><span class="eyebrow">Selección de la casa</span><h2>Favoritos del Guerrero</h2></div><p>Una carta pensada para compartir. Preparaciones al wok, entradas tradicionales y clásicos de la cocina chifa.</p></div><div class="public-menu">
        <article class="public-dish"><img class="dish-photo" src="/assets/chaufa.jpg" alt="Arroz chaufa servido" loading="lazy"><h3>Arroz chaufa</h3><p>Arroz salteado al wok con pollo, huevo y cebolla china.</p><strong>S/ 18.00</strong></article>
        <article class="public-dish"><img class="dish-photo" src="/assets/wantan-frito.jpg" alt="Wantanes dorados" loading="lazy"><h3>Wantán frito</h3><p>Porción crocante para compartir y acompañar tus platos.</p><strong>S/ 12.00</strong></article>
        <article class="public-dish"><img class="dish-photo" src="/assets/pollo-tipakay.jpg" alt="Pollo en salsa" loading="lazy"><h3>Pollo tipakay</h3><p>Pollo en salsa dulce con un delicado toque cítrico.</p><strong>S/ 22.00</strong></article>
        <article class="public-dish"><img class="dish-photo" src="/assets/sopa-wantan.jpg" alt="Sopa caliente" loading="lazy"><h3>Sopa wantán</h3><p>Caldo caliente con wantanes y fideo chino.</p><strong>S/ 15.00</strong></article>
      </div></section>
      <section class="public-section" id="experiencia" style="background:#f6f2eb"><div class="public-section-head"><div><span class="eyebrow">Atención conectada</span><h2>Siempre cerca de ti.</h2></div><p>Un canal claro para resolver consultas, recibir observaciones y mantenerte informado.</p></div><div class="grid grid-3"><article class="panel"><span class="kpi-icon">${icon('message')}</span><h3 style="margin:13px 0 6px;font-size:19px">Atención y reclamos</h3><p class="muted" style="font-size:10px;line-height:1.7">Registra un reclamo sin crear una cuenta y conserva tu código único de seguimiento.</p><button class="btn btn-secondary btn-small" data-action="public-complaint">Registrar reclamo</button></article><article class="panel"><span class="kpi-icon gold">${icon('search')}</span><h3 style="margin:13px 0 6px;font-size:19px">Seguimiento digital</h3><p class="muted" style="font-size:10px;line-height:1.7">Consulta el estado de tu solicitud con el identificador y código de validación.</p><button class="btn btn-secondary btn-small" data-action="public-track">Consultar estado</button></article><article class="panel"><span class="kpi-icon green">${icon('shield')}</span><h3 style="margin:13px 0 6px;font-size:19px">Operación organizada</h3><p class="muted" style="font-size:10px;line-height:1.7">Nuestro equipo utiliza herramientas de control para cuidar la calidad y continuidad del servicio.</p><button class="btn btn-secondary btn-small" data-action="go-login">Acceso de colaboradores</button></article></div></section>
      <footer class="public-footer"><b>CHIFA EL GUERRERO DRAGÓN</b><span>Lima, Perú · Sistema web de gestión y atención · 2026</span></footer>
    </div>`;
}

function renderLogin() {
  app.innerHTML = `
    <div class="auth-layout">
      <section class="auth-story">
        <div class="auth-brand"><span class="brand-seal">GD</span><span><b class="brand-name">EL GUERRERO DRAGÓN</b><small class="brand-caption">Chifa · Gestión integral</small></span></div>
        <div class="auth-copy"><span class="eyebrow">Tradición · control · servicio</span><h1>La operación detrás de una gran experiencia.</h1><p>Una plataforma unificada para administrar inventario, abastecimiento, costos de recetas y atención al cliente con trazabilidad de cada movimiento.</p><div class="auth-points"><div class="auth-point"><strong>360°</strong><span>Visibilidad operativa</span></div><div class="auth-point"><strong>IGV 18%</strong><span>Cálculo automático</span></div><div class="auth-point"><strong>3 roles</strong><span>Accesos diferenciados</span></div></div></div>
        <div class="auth-foot"><span>CHIFA EL GUERRERO DRAGÓN · LIMA, PERÚ</span><span>SISTEMA ACADÉMICO · 2026</span></div>
      </section>
      <section class="auth-form-wrap"><div class="auth-card">
        <span class="eyebrow">Acceso al sistema</span><h2>Bienvenido</h2><p>Ingrese sus credenciales para acceder al entorno de gestión.</p>
        <form id="login-form" class="form-stack">
          ${field('username', 'Usuario', 'text', '', { placeholder: 'Ingrese su usuario', hint: 'Seleccione uno de los perfiles de prueba o escriba sus credenciales.' })}
          ${field('password', 'Contraseña', 'password', '', { placeholder: 'Ingrese su contraseña' })}
          <button class="btn auth-submit" type="submit">Ingresar al sistema ${icon('arrow')}</button>
        </form>
        <div class="demo-access"><div class="demo-access-title">Perfiles de demostración</div><div class="demo-users">
          <button class="demo-user" type="button" data-demo="admin.guerrero|Guerrero2026!"><span><b>Carlos Mendoza</b><small>Gerente · Control integral</small></span><code>GER-001</code></button>
          <button class="demo-user" type="button" data-demo="maria.trab|Trabajo2026!"><span><b>María López</b><small>Trabajador · Operaciones</small></span><code>TRA-014</code></button>
          <button class="demo-user" type="button" data-demo="jose.caja|Caja2026!"><span><b>José Ramírez</b><small>Cajero · Punto de venta</small></span><code>CAJ-008</code></button>
        </div></div>
        <div class="auth-public-actions"><button type="button" data-action="public-complaint">Registrar reclamo público</button><button type="button" data-action="public-track">Consultar seguimiento</button></div>
      </div></section>
    </div>`;
}

function renderPublicComplaint() {
  app.innerHTML = `<div class="public-form-shell"><div class="public-form-card"><button class="btn btn-secondary btn-small" data-action="back-login" type="button">${icon('arrow')} Volver al acceso</button><span class="eyebrow" style="margin-top:24px">Canal público de atención</span><h1>Registrar reclamo o queja</h1><p>Complete sus datos y describa lo ocurrido. El sistema generará un código de seguimiento para consultar el estado de su caso.</p>
    <form id="public-complaint-form" class="form-stack">
      ${field('customerName', 'Nombre completo', 'text', '', { placeholder: 'Nombre y apellidos' })}
      ${field('email', 'Correo electrónico (opcional)', 'email', '', { required: false, placeholder: 'correo@ejemplo.com' })}
      ${selectField('type', 'Tipo de reclamo', [{ value: 'Atención', label: 'Atención' }, { value: 'Producto', label: 'Producto' }, { value: 'Delivery', label: 'Delivery' }, { value: 'Cobro', label: 'Cobro' }, { value: 'Otro', label: 'Otro' }])}
      ${field('detail', 'Detalle del reclamo', 'textarea', '', { placeholder: 'Describa lo sucedido con el mayor detalle posible.' })}
      <button class="btn" type="submit">Enviar reclamo ${icon('arrow')}</button>
    </form><div id="public-result"></div>
  </div></div>`;
}

function renderPublicTrack() {
  app.innerHTML = `<div class="public-form-shell"><div class="public-form-card"><button class="btn btn-secondary btn-small" data-action="back-login" type="button">${icon('arrow')} Volver al acceso</button><span class="eyebrow" style="margin-top:24px">Centro de seguimiento</span><h1>Consulte su reclamo</h1><p>Ingrese el identificador y el código confidencial proporcionados al registrar su caso.</p>
    <form id="public-track-form" class="form-stack">${field('complaintId', 'Número de seguimiento', 'text', '', { placeholder: 'REC-20261029-...' })}${field('trackingCode', 'Código de validación', 'text', '', { placeholder: 'GDR-XXXXXX' })}<button class="btn" type="submit">Consultar estado ${icon('arrow')}</button></form><div id="public-result"></div>
  </div></div>`;
}

function sidebarMarkup() {
  const groups = navGroups.map((group) => {
    const links = group.links.filter((link) => link.roles.includes(state.user.role));
    if (!links.length) return '';
    return `<div class="nav-group"><div class="nav-label">${esc(group.label)}</div>${links.map((link) => `<button type="button" class="nav-link ${state.view === link.id ? 'active' : ''}" data-view="${link.id}">${icon(link.icon)}<span>${esc(link.label)}</span>${link.id === 'alerts' && state.alertCount ? `<span class="nav-count">${state.alertCount}</span>` : ''}</button>`).join('')}</div>`;
  }).join('');
  return `<aside class="sidebar"><div class="sidebar-brand"><span class="brand-seal">GD</span><span><b class="brand-name">EL GUERRERO DRAGÓN</b><small class="brand-caption">Sistema de gestión operativa</small></span></div><nav class="nav-scroll">${groups}</nav><div class="sidebar-bottom"><div class="user-compact"><span class="avatar">${esc(initials(state.user.name))}</span><span><b>${esc(state.user.name)}</b><small>${esc(state.user.role)} · ${esc(state.user.code)}</small></span></div><button class="logout-button" data-action="logout" type="button">${icon('logout')} Cerrar sesión</button></div></aside>`;
}

async function renderShell() {
  const meta = viewMeta[state.view] || viewMeta.dashboard;
  app.innerHTML = `<div class="app-shell">${sidebarMarkup()}<main class="main"><header class="topbar"><div class="topbar-left"><span class="topbar-title">${esc(meta[1])}</span><span class="topbar-divider"></span><span class="topbar-context">Chifa El Guerrero Dragón / Operaciones</span></div><div class="topbar-right"><span class="today-label">${new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</span><span class="role-chip">${esc(state.user.role)}</span></div></header><section class="content" id="view-content"><div class="boot-screen">Cargando módulo…</div></section></main></div><dialog id="app-dialog"><div class="dialog-head"><h2 id="dialog-title"></h2><button class="icon-button" type="button" data-action="close-dialog" aria-label="Cerrar">${icon('close')}</button></div><div class="dialog-body" id="dialog-body"></div></dialog>`;
  try {
    await renderCurrentView();
  } catch (error) {
    document.querySelector('#view-content').innerHTML = `<div class="panel">${empty('No se pudo cargar el módulo', error.message)}<div style="text-align:center">${actionButton('Volver al panel', 'go-dashboard')}</div></div>`;
  }
}

async function setView(view) {
  const allowed = navGroups.flatMap((x) => x.links).filter((x) => x.roles.includes(state.user.role)).map((x) => x.id);
  if (!allowed.includes(view)) { toast('Su perfil no tiene acceso a ese módulo.', 'error'); return; }
  state.view = view;
  history.replaceState(null, '', `#${view}`);
  await renderShell();
}

async function renderCurrentView() {
  const target = document.querySelector('#view-content');
  const renderers = {
    dashboard: renderDashboard, inventory: renderInventory, kardex: renderKardex,
    suppliers: renderSuppliers, purchases: renderPurchases, recipes: renderRecipes,
    alerts: renderAlerts, returns: renderReturns, pos: renderPos,
    incidents: renderIncidents, stockReports: renderStockReports,
    requests: renderRequests, complaints: renderComplaints, kpis: renderKpis, audit: renderAudit
  };
  await (renderers[state.view] || renderDashboard)(target);
}

function kpiCard(label, value, foot, iconName, tone = '') {
  return `<article class="kpi-card"><div class="kpi-label"><span>${esc(label)}</span><span class="kpi-icon ${tone}">${icon(iconName)}</span></div><strong class="kpi-value">${esc(value)}</strong><div class="kpi-foot">${foot}</div></article>`;
}
function barsMarkup(items, labelField = 'date', valueField = 'total') {
  const data = items || [];
  const max = Math.max(1, ...data.map((x) => Number(x[valueField] || 0)));
  return `<div class="chart-bars">${data.length ? data.map((x) => `<div class="chart-column"><b>${money(x[valueField])}</b><span class="bar" style="height:${Math.max(3, Number(x[valueField] || 0) / max * 130)}px"></span><small>${esc(dateShort(x[labelField]))}</small></div>`).join('') : empty('Sin movimientos en el periodo', 'Las ventas aparecerán aquí cuando se registren operaciones.')}</div>`;
}

async function renderDashboard(target) {
  const [data, week] = await Promise.all([api.overview(), api.kpis(daysAgo(6), todayIso())]);
  state.alertCount = data.stockAlerts.length;
  state.lastAlertIds = new Set(data.stockAlerts.map((x) => x.id));
  const recentKardex = data.recentKardex.slice(0, 6);
  target.innerHTML = `${pageHeading('Resumen ejecutivo', 'Panel principal', 'Vista consolidada de ventas, inventario y alertas operativas.')}
    <section class="dashboard-banner"><div><span class="eyebrow">CHIFA EL GUERRERO DRAGÓN</span><h2>Controla la operación. Anticípate al siguiente movimiento.</h2><p>Bienvenido, ${esc(state.user.name)}. Los indicadores se actualizan a partir de la actividad registrada.</p></div><div class="banner-meta">${new Intl.DateTimeFormat('es-PE', { dateStyle: 'full' }).format(new Date())}</div></section>
    <div class="grid grid-4" style="margin-bottom:16px">
      ${kpiCard('Ventas del día', money(data.today.revenue), `${data.today.orderCount} operaciones registradas`, 'cash', 'green')}
      ${kpiCard('Valor del inventario', money(data.inventoryValue), 'Valorización al costo actual', 'boxes', 'gold')}
      ${kpiCard('Alertas de stock', String(data.stockAlerts.length), data.stockAlerts.length ? 'Requieren reposición o revisión' : 'Todos los mínimos cubiertos', 'alert', data.stockAlerts.length ? '' : 'green')}
      ${kpiCard('Órdenes por recibir', String(data.purchaseOrdersPending), 'Órdenes de compra emitidas', 'truck', 'blue')}
    </div>
    <div class="grid grid-2" style="margin-bottom:16px">
      <section class="panel">${panelHead('Evolución de ventas', 'Últimos siete días', `<span class="chart-legend"><i class="legend-dot"></i> Ingresos</span>`)}${barsMarkup(week.dailySales)}</section>
      <section class="panel">${panelHead('Alertas prioritarias', 'Insumos en punto de reposición', actionButton('Ver alertas', 'go-alerts', 'btn-quiet btn-small'))}
        ${data.stockAlerts.length ? data.stockAlerts.slice(0, 5).map((item) => `<div class="alert-row"><span class="alert-symbol">${icon('alert')}</span><span><b>${esc(item.name)}</b><small>${esc(item.category)} · Mínimo ${number(item.minStock, 2)} ${esc(item.unit)}</small></span><span class="alert-stock">${number(item.stock, 2)} ${esc(item.unit)}<small>Disponible</small></span></div>`).join('') : empty('Inventario equilibrado', 'No hay insumos por debajo del stock mínimo.')}
      </section>
    </div>
    <section class="panel">${panelHead('Movimientos recientes de almacén', 'Trazabilidad de entradas y salidas', actionButton('Abrir Kardex', 'go-kardex', 'btn-quiet btn-small'))}
      <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Insumo</th><th>Movimiento</th><th>Cantidad</th><th>Saldo resultante</th><th>Referencia</th></tr></thead><tbody>${recentKardex.map((x) => `<tr><td>${dateTime(x.date)}</td><td><strong>${esc(x.itemName)}</strong></td><td>${pill(x.type)}</td><td>${number(x.quantity, 3)}</td><td><strong>${number(x.after, 3)}</strong></td><td>${esc(x.reference)}</td></tr>`).join('') || `<tr><td colspan="6">${empty('Sin movimientos', 'Aún no se han registrado movimientos de inventario.')}</td></tr>`}</tbody></table></div>
    </section>`;
}
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

async function renderInventory(target) {
  const items = await api.items(); state.inventory = items;
  target.innerHTML = `${pageHeading('Almacén e inventario', 'Control de inventario', 'Existencias actuales, valorización, clasificación y punto mínimo de reposición.', `<button class="btn btn-secondary" data-action="open-movement" data-type="SALIDA">Registrar salida</button><button class="btn" data-action="open-movement" data-type="ENTRADA">${icon('plus')} Registrar entrada</button>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${kpiCard('Insumos activos', String(items.length), 'Catálogo central de almacén', 'boxes')}
      ${kpiCard('Valor a costo', money(items.reduce((s, x) => s + x.stock * x.unitCost, 0)), 'Costo promedio registrado', 'coins', 'gold')}
      ${kpiCard('Bajo mínimo', String(items.filter((x) => x.stock <= x.minStock).length), 'Incluye los niveles críticos', 'alert')}
      ${kpiCard('Categorías', String(new Set(items.map((x) => x.category)).size), 'Familias de insumos', 'list', 'blue')}
    </div>
    <section class="panel">${panelHead('Maestro de insumos', 'El stock solo se modifica mediante movimientos transaccionales.')}
      <div class="toolbar"><div class="toolbar-left"><div class="search-field">${icon('search')}<input id="inventory-search" type="search" placeholder="Buscar insumo, SKU o categoría…" autocomplete="off"></div><select class="select-sm" id="inventory-filter"><option value="all">Todas las existencias</option><option value="low">Bajo mínimo</option><option value="ok">Stock suficiente</option></select></div><div class="toolbar-right"><span class="muted" style="font-size:9px">Moneda: PEN · S/</span></div></div>
      <div class="table-wrap"><table><thead><tr><th>SKU / Insumo</th><th>Categoría</th><th>Ubicación / Lote</th><th>Stock actual</th><th>Stock mínimo</th><th>Costo unitario</th><th>Valorizado</th><th>Estado</th></tr></thead><tbody id="inventory-rows">${inventoryRows(items)}</tbody></table></div>
    </section>`;
}
function inventoryRows(items) {
  return items.map((item) => `<tr data-row-search="${esc(`${item.name} ${item.sku} ${item.category}`.toLowerCase())}" data-low="${item.stock <= item.minStock}"><td><strong>${esc(item.name)}</strong><small>${esc(item.sku)}</small></td><td>${esc(item.category)}</td><td>${esc(item.location)}<small>Lote ${esc(item.lot)}</small></td><td><strong>${number(item.stock, 3)} ${esc(item.unit)}</strong></td><td>${number(item.minStock, 3)} ${esc(item.unit)}</td><td>${money(item.unitCost)}</td><td><strong>${money(item.stock * item.unitCost)}</strong></td><td>${item.stock <= item.minStock ? pill(item.stock <= item.minStock * .5 ? 'Crítica' : 'Bajo mínimo') : pill('Normal')}</td></tr>`).join('') || `<tr><td colspan="8">${empty('No hay insumos', 'Agregue los insumos iniciales en el catálogo de datos.')}</td></tr>`;
}

async function renderKardex(target) {
  const [records, items] = await Promise.all([api.kardex(), api.items()]);
  target.innerHTML = `${pageHeading('Trazabilidad', 'Kardex transaccional', 'Cada entrada y salida se registra con saldo anterior, cantidad, saldo resultante y referencia.', `<button class="btn" data-action="open-movement" data-type="ENTRADA">${icon('plus')} Nuevo movimiento</button>`)}
    <section class="panel">${panelHead('Libro de movimientos', 'Registro cronológico del inventario. Los movimientos por compra y venta se generan automáticamente.')}
      <div class="toolbar"><div class="toolbar-left"><select id="kardex-item-filter" class="select-sm"><option value="">Todos los insumos</option>${items.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><select id="kardex-type-filter" class="select-sm"><option value="">Todos los tipos</option><option>APERTURA</option><option>ENTRADA</option><option>SALIDA</option></select></div><div class="toolbar-right"><span class="muted" style="font-size:9px">${records.length} movimientos</span></div></div>
      <div class="table-wrap"><table><thead><tr><th>Fecha y hora</th><th>Insumo</th><th>Tipo</th><th>Entrada / salida</th><th>Saldo anterior</th><th>Saldo final</th><th>Referencia</th><th>Usuario</th></tr></thead><tbody id="kardex-rows">${kardexRows(records)}</tbody></table></div>
    </section>`;
}
function kardexRows(records) {
  return records.map((x) => `<tr><td>${dateTime(x.date)}</td><td><strong>${esc(x.itemName)}</strong></td><td>${pill(x.type)}</td><td>${x.type === 'SALIDA' ? '−' : '+'}${number(x.quantity, 3)}</td><td>${number(x.before, 3)}</td><td><strong>${number(x.after, 3)}</strong></td><td>${esc(x.reference)}<small>${esc(x.reason)}</small></td><td>${esc(x.user)}</td></tr>`).join('') || `<tr><td colspan="8">${empty('Sin movimientos', 'No se encontraron movimientos para los filtros seleccionados.')}</td></tr>`;
}

async function renderSuppliers(target) {
  const suppliers = await api.suppliers(); state.suppliers = suppliers;
  target.innerHTML = `${pageHeading('Abastecimiento', 'Gestión de proveedores', 'RUC de 11 dígitos, razón social única por registro, datos de contacto y score ponderado.', `<button class="btn" data-action="open-supplier">${icon('plus')} Nuevo proveedor</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">${kpiCard('Proveedores activos', String(suppliers.length), 'Registro local de abastecimiento', 'truck')}${kpiCard('Evaluados', String(suppliers.filter((x) => x.score !== null).length), 'Con al menos una evaluación', 'star', 'gold')}${kpiCard('Score promedio', `${number(avg(suppliers.filter((x) => x.score !== null).map((x) => x.score)), 1)} / 100`, 'Ponderación: calidad 40%, cumplimiento 30%, puntualidad 30%', 'chart', 'green')}</div>
    <section class="panel">${panelHead('Directorio de proveedores', 'El puntaje se calcula a partir de las evaluaciones registradas en mermas y devoluciones.')}
      <div class="table-wrap"><table><thead><tr><th>Razón social / RUC</th><th>Contacto</th><th>Teléfono y correo</th><th>Ubicación</th><th>Evaluaciones</th><th>Desempeño</th></tr></thead><tbody>${suppliers.map((x) => `<tr><td><strong>${esc(x.businessName)}</strong><small>RUC ${esc(x.ruc)}</small></td><td>${esc(x.contact)}<small>${esc(x.tradeName || '—')}</small></td><td>${esc(x.phone || '—')}<small>${esc(x.email || '—')}</small></td><td>${esc(x.address)}</td><td>${(x.evaluations || []).length}</td><td>${x.score === null ? '<span class="muted">Sin evaluar</span>' : `<strong>${number(x.score, 1)} / 100</strong><small>${x.score >= 85 ? pill('Desempeño alto') : x.score >= 70 ? pill('Desempeño medio') : pill('Requiere mejora')}</small>`}</td></tr>`).join('') || `<tr><td colspan="6">${empty('Sin proveedores', 'Registre un proveedor para poder emitir órdenes de compra.')}</td></tr>`}</tbody></table></div>
    </section>`;
}
function avg(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }

async function renderPurchases(target) {
  const [orders, suppliers] = await Promise.all([api.purchaseOrders(), api.suppliers()]);
  const pending = orders.filter((x) => x.status === 'Emitida').length;
  target.innerHTML = `${pageHeading('Abastecimiento', 'Órdenes de compra', 'Emisión documental con cálculo automático del IGV (18%) y recepción atómica de las líneas de compra.', `<button class="btn" data-action="open-purchase">${icon('plus')} Emitir orden de compra</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">${kpiCard('Órdenes emitidas', String(pending), 'Pendientes de recepción física', 'receipt')}${kpiCard('Órdenes históricas', String(orders.length), 'Documentos registrados', 'file', 'blue')}${kpiCard('Compras recibidas', money(orders.filter((x) => x.status === 'Recibida').reduce((s, x) => s + x.total, 0)), 'Valor total recibido', 'coins', 'gold')}</div>
    <section class="panel">${panelHead('Historial de órdenes', 'La recepción actualiza stock y Kardex en una única transacción. Una orden recibida no puede ingresarse nuevamente.')}
      <div class="table-wrap"><table><thead><tr><th>Documento</th><th>Proveedor</th><th>Emisión</th><th>Líneas</th><th>Subtotal</th><th>IGV 18%</th><th>Total</th><th>Estado / acción</th></tr></thead><tbody>${orders.map((x) => `<tr><td><strong>${esc(x.id)}</strong></td><td>${esc(x.supplierName)}</td><td>${dateShort(x.issueDate)}</td><td>${x.items.length}</td><td>${money(x.subtotal)}</td><td>${money(x.tax)}</td><td><strong>${money(x.total)}</strong></td><td><div class="table-actions">${pill(x.status)}${x.status === 'Emitida' ? `<button class="btn btn-small" data-action="receive-order" data-id="${esc(x.id)}">Recibir</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="8">${empty('Sin órdenes de compra', 'Emita la primera orden para iniciar el flujo de abastecimiento.')}</td></tr>`}</tbody></table></div>
    </section>`;
}

async function renderRecipes(target) {
  const [recipes, items] = await Promise.all([api.recipes(), api.items()]);
  state.recipes = recipes; state.items = items;
  target.innerHTML = `${pageHeading('Costeo y producción', 'Recetas y escandallo', 'Cada plato define los insumos y gramajes necesarios para que las ventas descuenten el almacén automáticamente.', `<button class="btn" data-action="open-recipe">${icon('plus')} Nueva receta</button>`)}
    <div class="note" style="margin-bottom:15px">${icon('clipboard')} El costo estimado se calcula usando el costo unitario vigente de cada insumo. Al registrar una venta, los componentes de todas las recetas se consolidan y descuentan de forma atómica.</div>
    <div class="recipe-grid">${recipes.map((recipe) => `<article class="recipe-card"><div class="recipe-card-top"><div><span class="panel-kicker">${esc(recipe.category)}</span><h3>${esc(recipe.name)}</h3></div><span class="recipe-price">${money(recipe.price)}</span></div><p>${esc(recipe.description || 'Receta de la carta.')}</p><div class="recipe-meta"><span>${recipe.ingredients.length} insumos</span><span>Costo aprox. ${money(recipe.estimatedCost)}</span></div><div class="recipe-ingredients">${recipe.ingredients.map((line) => { const item = items.find((x) => x.id === line.itemId); return `<span class="ingredient-chip">${esc(item?.name || line.itemId)} · ${number(line.qty, 3)} ${esc(item?.unit || '')}</span>`; }).join('')}</div><div class="recipe-meta"><span>Margen bruto estimado</span><strong>${number(recipe.price ? (recipe.price - recipe.estimatedCost) / recipe.price * 100 : 0, 1)}%</strong></div></article>`).join('') || empty('Sin recetas', 'Configure las recetas antes de registrar ventas con descuento de inventario.')}</div>`;
}

async function renderAlerts(target) {
  const alerts = await api.alerts();
  target.innerHTML = `${pageHeading('Monitoreo de almacén', 'Alertas de stock mínimo', 'Motor reactivo: cada consulta evalúa stock_actual ≤ stock_mínimo con los saldos vigentes.', `<button class="btn btn-secondary" data-view="inventory">Ver inventario</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">${kpiCard('Alertas activas', String(alerts.length), 'Insumos al nivel mínimo o por debajo', 'alert')}${kpiCard('Críticas', String(alerts.filter((x) => x.severity === 'Crítica').length), 'Stock igual o menor al 50% del mínimo', 'alert')}${kpiCard('Insumos monitoreados', String((await api.items()).length), 'Evaluación por cada insumo activo', 'boxes', 'blue')}</div>
    <section class="panel">${panelHead('Centro de alertas', 'Priorice los artículos con menor cobertura respecto al stock mínimo.')}
      ${alerts.length ? alerts.map((item) => `<div class="alert-row"><span class="alert-symbol">${icon('alert')}</span><span><b>${esc(item.name)} ${pill(item.severity)}</b><small>${esc(item.sku)} · ${esc(item.location)} · Lote ${esc(item.lot)}</small><small>Stock mínimo ${number(item.minStock, 3)} ${esc(item.unit)} · Déficit ${number(item.deficit, 3)} ${esc(item.unit)}</small></span><span class="alert-stock">${number(item.stock, 3)} ${esc(item.unit)}<small>Saldo actual</small></span></div>`).join('') : empty('Sin alertas críticas', 'Todos los insumos mantienen existencias superiores a sus niveles mínimos.')}
    </section>`;
}

async function renderReturns(target) {
  const [records, items, suppliers] = await Promise.all([api.returns(), api.items(), api.suppliers()]);
  target.innerHTML = `${pageHeading('Control de calidad', 'Mermas y devoluciones', 'Registre lotes defectuosos, ajuste el stock y evalúe al proveedor con un score ponderado.', `<button class="btn" data-action="open-return">${icon('plus')} Registrar incidencia de lote</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">${kpiCard('Registros históricos', String(records.length), 'Mermas y devoluciones', 'package')}${kpiCard('Cantidad afectada', number(records.reduce((s, x) => s + x.quantity, 0), 2), 'Unidades según unidad base del insumo', 'alert')}${kpiCard('Proveedores evaluados', String(suppliers.filter((x) => x.score !== null).length), 'Con calificación ponderada', 'star', 'gold')}</div>
    <section class="panel">${panelHead('Registro de calidad y devoluciones', 'La salida por devolución o merma genera su propio movimiento en Kardex.')}
      <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Registro</th><th>Insumo / lote</th><th>Tipo</th><th>Cantidad</th><th>Proveedor</th><th>Evaluación</th><th>Motivo</th></tr></thead><tbody>${records.map((x) => { const s = suppliers.find((y) => y.id === x.supplierId); const score = x.evaluation ? x.evaluation.compliance * .3 + x.evaluation.delivery * .3 + x.evaluation.quality * .4 : null; return `<tr><td>${dateShort(x.date)}</td><td><strong>${esc(x.id)}</strong></td><td>${esc(x.itemName)}<small>Lote ${esc(x.lot)}</small></td><td>${pill(x.type)}</td><td>${number(x.quantity, 3)}</td><td>${esc(x.supplierName)}</td><td>${score === null ? '—' : `<strong>${number(score, 1)} / 100</strong>`}</td><td>${esc(x.reason)}</td></tr>`; }).join('') || `<tr><td colspan="8">${empty('Sin registros', 'Las incidencias de calidad aparecerán en esta tabla.')}</td></tr>`}</tbody></table></div>
    </section>`;
}

async function renderPos(target) {
  const [recipes, sales] = await Promise.all([api.recipes(), api.sales()]);
  state.recipes = recipes;
  const cartRows = state.cart.map((line) => { const recipe = recipes.find((x) => x.id === line.recipeId); return recipe ? { ...line, recipe } : null; }).filter(Boolean);
  const subtotal = cartRows.reduce((sum, line) => sum + line.recipe.price * line.quantity, 0);
  target.innerHTML = `${pageHeading('Punto de venta', 'Caja y registro de pedidos', 'Las ventas aplican el escandallo y descuentan el stock de manera atómica antes de emitir el ticket.', `<button class="btn btn-secondary" data-action="view-sales">Historial de ventas</button>`)}
    ${state.lastSale ? `<section class="panel" style="margin-bottom:15px">${panelHead('Último ticket emitido', `Venta ${esc(state.lastSale.id)} · ${dateTime(state.lastSale.date)}`, `<button class="btn btn-secondary btn-small" data-action="print-ticket">${icon('print')} Imprimir ticket</button>`)}<div class="ticket-print" id="receipt-to-print"><h3>CHIFA EL GUERRERO DRAGÓN</h3><div class="ticket-center">RUC DEMOSTRATIVO · LIMA, PERÚ<br>TICKET DE VENTA</div><hr class="ticket-rule"><div>Documento: ${esc(state.lastSale.id)}</div><div>Atendido por: ${esc(state.lastSale.cashier)}</div><div>Cliente: ${esc(state.lastSale.customer)}</div><div>Pago: ${esc(state.lastSale.payment)}</div><hr class="ticket-rule">${state.lastSale.items.map((x) => `<div class="ticket-line"><span>${x.quantity} × ${esc(x.name)}</span><b>${money(x.quantity * x.unitPrice)}</b></div>`).join('')}<hr class="ticket-rule"><div class="ticket-line"><b>Subtotal</b><b>${money(state.lastSale.subtotal)}</b></div><div class="ticket-line"><span>Descuento</span><span>${money(state.lastSale.discount)}</span></div><div class="ticket-line"><b>TOTAL</b><b>${money(state.lastSale.total)}</b></div><hr class="ticket-rule"><div class="ticket-center">Gracias por su preferencia.<br>Comprobante académico de demostración.</div></div></section>` : ''}
    <div class="pos-layout"><section class="panel">${panelHead('Carta disponible', 'Seleccione los platos para agregarlos al pedido.')}
      <div class="pos-products">${recipes.map((x) => `<article class="pos-product"><div><b>${esc(x.name)}</b><small>${esc(x.category)}</small><strong>${money(x.price)}</strong></div><button class="pos-add" data-action="cart-add" data-id="${esc(x.id)}" aria-label="Agregar ${esc(x.name)}">+</button></article>`).join('')}</div>
    </section><section class="panel cart-panel">${panelHead('Pedido actual', `${cartRows.reduce((s, x) => s + x.quantity, 0)} unidades en el pedido`)}
      ${cartRows.length ? cartRows.map((line) => `<div class="cart-row"><span><b>${esc(line.recipe.name)}</b><small>${money(line.recipe.price)} por unidad</small></span><span class="qty-control"><button data-action="cart-dec" data-id="${esc(line.recipeId)}" type="button">−</button><span>${line.quantity}</span><button data-action="cart-inc" data-id="${esc(line.recipeId)}" type="button">+</button></span><strong>${money(line.recipe.price * line.quantity)}</strong></div>`).join('') : empty('Pedido vacío', 'Agregue uno o más platos desde la carta.')}
      <form id="sale-form" style="margin-top:14px"><div class="form-grid">${field('customer', 'Cliente / mesa', 'text', 'Mostrador', { required: false })}${selectField('payment', 'Método de pago', [{ value: 'Efectivo', label: 'Efectivo' }, { value: 'Yape / Plin', label: 'Yape / Plin' }, { value: 'Tarjeta', label: 'Tarjeta' }])}${field('discount', 'Descuento (S/)', 'number', '0', { min: 0, step: .01, required: false, className: 'span-2' })}</div><div class="cart-totals"><div class="cart-total-row"><span>Subtotal</span><b>${money(subtotal)}</b></div><div class="cart-total-row total"><span>Total a pagar</span><b>${money(subtotal)}</b></div></div><button class="btn" type="submit" style="width:100%;margin-top:16px" ${cartRows.length ? '' : 'disabled'}>Confirmar venta y descontar stock</button><button class="btn btn-secondary" type="button" data-action="clear-cart" style="width:100%;margin-top:7px" ${cartRows.length ? '' : 'disabled'}>Vaciar pedido</button></form>
    </section></div>
    <section class="panel" id="sales-list" style="margin-top:16px">${panelHead('Ventas recientes', 'Últimas transacciones de caja')}
      <div class="table-wrap"><table><thead><tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Atendió</th><th>Total</th></tr></thead><tbody>${sales.slice(0, 7).map((x) => `<tr><td><strong>${esc(x.id)}</strong></td><td>${dateTime(x.date)}</td><td>${esc(x.customer)}</td><td>${esc(x.payment)}</td><td>${esc(x.cashier)}</td><td><strong>${money(x.total)}</strong></td></tr>`).join('') || `<tr><td colspan="6">${empty('Sin ventas registradas', 'La primera venta aparecerá aquí.')}</td></tr>`}</tbody></table></div>
    </section>`;
}

async function renderIncidents(target) {
  const records = await api.incidents();
  target.innerHTML = `${pageHeading('Continuidad operativa', 'Incidencias operativas', 'Registro de fallas de equipos, infraestructura y mobiliario.')}
    <section class="panel">${panelHead('Nueva incidencia', 'Describa el problema y su prioridad para facilitar la atención.')}
      <form id="incident-form"><div class="form-grid cols-3">${selectField('category', 'Categoría', [{ value: 'Equipos', label: 'Equipos' }, { value: 'Infraestructura', label: 'Infraestructura' }, { value: 'Mobiliario', label: 'Mobiliario' }, { value: 'Sistemas', label: 'Sistemas' }, { value: 'Otros', label: 'Otros' }])}${selectField('priority', 'Prioridad', [{ value: 'Baja', label: 'Baja' }, { value: 'Media', label: 'Media' }, { value: 'Alta', label: 'Alta' }])}${field('title', 'Equipo / asunto', 'text', '', { placeholder: 'Ej. Impresora de caja' })}<div class="span-3">${field('detail', 'Detalle', 'textarea', '', { placeholder: 'Describa la falla, ubicación y efecto en la operación.' })}</div></div><div class="form-actions"><button class="btn" type="submit">Registrar incidencia</button></div></form>
    </section>
    <section class="panel" style="margin-top:15px">${panelHead('Incidencias registradas', `${records.length} registros`)}<div class="table-wrap"><table><thead><tr><th>Código / fecha</th><th>Asunto</th><th>Categoría</th><th>Prioridad</th><th>Registró</th><th>Estado</th><th>Actualizar</th></tr></thead><tbody>${records.map((x) => `<tr><td><strong>${esc(x.id)}</strong><small>${dateTime(x.date)}</small></td><td>${esc(x.title)}<small>${esc(x.detail)}</small></td><td>${esc(x.category)}</td><td>${pill(x.priority)}</td><td>${esc(x.createdBy)}</td><td>${pill(x.status)}</td><td>${state.user.role === ROLE.manager ? `<select class="select-sm" data-status-collection="incidents" data-status-id="${esc(x.id)}"><option ${x.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option><option ${x.status === 'En atención' ? 'selected' : ''}>En atención</option><option ${x.status === 'Atendida' ? 'selected' : ''}>Atendida</option></select>` : '—'}</td></tr>`).join('') || `<tr><td colspan="7">${empty('Sin incidencias', 'No se han registrado incidencias.')}</td></tr>`}</tbody></table></div></section>`;
}

async function renderStockReports(target) {
  const [reports, items] = await Promise.all([api.stockReports(), api.items()]);
  target.innerHTML = `${pageHeading('Continuidad operativa', 'Reportes de desabastecimiento', 'Los trabajadores pueden comunicar faltantes de insumos y solicitar reposición al área responsable.')}
    <section class="panel">${panelHead('Reportar faltante', 'Este reporte no modifica el stock; la entrada real debe registrarse mediante Kardex o compra.')}
      <form id="stock-report-form"><div class="form-grid cols-3">${selectField('itemId', 'Insumo', items.map((x) => ({ value: x.id, label: `${x.name} · ${number(x.stock, 2)} ${x.unit}` })))}${field('quantity', 'Cantidad solicitada', 'number', '', { min: .001, step: .001 })}${selectField('priority', 'Prioridad', [{ value: 'Baja', label: 'Baja' }, { value: 'Media', label: 'Media' }, { value: 'Alta', label: 'Alta' }])}<div class="span-3">${field('detail', 'Detalle del requerimiento', 'textarea', '', { required: false, placeholder: 'Indique por qué se requiere la reposición.' })}</div></div><div class="form-actions"><button class="btn" type="submit">Enviar reporte</button></div></form>
    </section><section class="panel" style="margin-top:15px">${panelHead('Solicitudes de reposición', `${reports.length} reportes`)}<div class="table-wrap"><table><thead><tr><th>Código</th><th>Insumo</th><th>Cantidad</th><th>Prioridad</th><th>Registró</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>${reports.map((x) => `<tr><td><strong>${esc(x.id)}</strong></td><td>${esc(x.itemName)}<small>${esc(x.detail)}</small></td><td>${number(x.quantity, 3)}</td><td>${pill(x.priority)}</td><td>${esc(x.createdBy)}</td><td>${dateTime(x.date)}</td><td>${pill(x.status)}</td></tr>`).join('') || `<tr><td colspan="7">${empty('Sin reportes', 'Los reportes de faltantes aparecerán aquí.')}</td></tr>`}</tbody></table></div></section>`;
}

async function renderRequests(target) {
  const records = await api.requests();
  const isManager = state.user.role === ROLE.manager;
  target.innerHTML = `${pageHeading('Gestión de personas', 'Solicitudes de personal', 'Permisos, vacaciones y requerimientos internos con flujo de aprobación gerencial.')}
    ${!isManager ? `<section class="panel">${panelHead('Registrar una solicitud', 'La solicitud quedará pendiente hasta que sea revisada por gerencia.')}<form id="request-form"><div class="form-grid">${selectField('type', 'Tipo de solicitud', [{ value: 'Permiso', label: 'Permiso' }, { value: 'Vacaciones', label: 'Vacaciones' }, { value: 'Cambio de turno', label: 'Cambio de turno' }, { value: 'Otro requerimiento', label: 'Otro requerimiento' }])}${field('requestedDate', 'Fecha solicitada', 'date', todayIso())}<div class="span-2">${field('detail', 'Motivo / detalle', 'textarea', '', { placeholder: 'Describa su solicitud.' })}</div></div><div class="form-actions"><button class="btn" type="submit">Enviar solicitud</button></div></form></section>` : ''}
    <section class="panel" style="margin-top:15px">${panelHead(isManager ? 'Bandeja de aprobación' : 'Mis solicitudes', `${records.length} registros`)}<div class="table-wrap"><table><thead><tr><th>Código</th><th>Colaborador</th><th>Tipo</th><th>Fecha solicitada</th><th>Detalle</th><th>Estado</th>${isManager ? '<th>Decisión</th>' : ''}</tr></thead><tbody>${records.map((x) => `<tr><td><strong>${esc(x.id)}</strong><small>${dateTime(x.date)}</small></td><td>${esc(x.createdBy)}</td><td>${esc(x.type)}</td><td>${esc(x.requestedDate || '—')}</td><td>${esc(x.detail)}</td><td>${pill(x.status)}</td>${isManager ? `<td><div class="table-actions"><button class="btn btn-small" data-action="request-status" data-id="${esc(x.id)}" data-status="Aprobada">Aprobar</button><button class="btn btn-small btn-secondary" data-action="request-status" data-id="${esc(x.id)}" data-status="Rechazada">Rechazar</button></div></td>` : ''}</tr>`).join('') || `<tr><td colspan="${isManager ? 7 : 6}">${empty('Sin solicitudes', 'No hay solicitudes para mostrar.')}</td></tr>`}</tbody></table></div></section>`;
}

async function renderComplaints(target) {
  const records = await api.complaints();
  target.innerHTML = `${pageHeading('Atención al cliente', 'Reclamos y quejas', 'Gestión de casos registrados desde el canal público y seguimiento mediante código único.')}
    <section class="panel">${panelHead('Casos recibidos', `${records.length} reclamos y quejas`, `<button class="btn btn-secondary btn-small" data-action="copy-public-link">Copiar enlace público</button>`)}<div class="table-wrap"><table><thead><tr><th>Seguimiento</th><th>Cliente</th><th>Tipo</th><th>Detalle</th><th>Fecha</th><th>Estado</th><th>Gestión</th></tr></thead><tbody>${records.map((x) => `<tr><td><strong>${esc(x.id)}</strong><small>${esc(x.trackingCode)}</small></td><td>${esc(x.customerName)}<small>${esc(x.email || 'Sin correo')}</small></td><td>${esc(x.type)}</td><td>${esc(x.detail)}</td><td>${dateTime(x.date)}</td><td>${pill(x.status)}</td><td><button class="btn btn-small btn-secondary" data-action="complaint-manage" data-id="${esc(x.id)}">Actualizar caso</button></td></tr>`).join('') || `<tr><td colspan="7">${empty('Sin reclamos', 'Los reclamos públicos aparecerán aquí al ser enviados.')}</td></tr>`}</tbody></table></div></section>`;
}

async function renderKpis(target) {
  const from = daysAgo(29), to = todayIso();
  const data = await api.kpis(from, to);
  target.innerHTML = `${pageHeading('Inteligencia de negocio', 'KPIs gerenciales', 'Consolidación de métricas financieras y operativas para un periodo configurable.')}
    <section class="panel" style="margin-bottom:15px">${panelHead('Periodo de análisis', 'El filtro considera ventas registradas dentro del rango elegido.')}<form id="kpi-filter" class="toolbar"><div class="toolbar-left"><div class="field"><label for="from">Desde</label><input class="input-sm" id="from" name="from" type="date" value="${from}" required></div><div class="field"><label for="to">Hasta</label><input class="input-sm" id="to" name="to" type="date" value="${to}" required></div></div><button class="btn" type="submit">Aplicar filtros</button></form></section>
    <div id="kpi-content">${kpiContent(data)}</div>`;
}
function kpiContent(data) {
  return `<div class="grid grid-4" style="margin-bottom:15px">${kpiCard('Ingresos netos', money(data.revenue), `${data.orderCount} operaciones`, 'coins', 'green')}${kpiCard('Costo estimado', money(data.estimatedCost), 'Según costo de escandallo vigente', 'package', 'gold')}${kpiCard('Margen bruto estimado', money(data.grossMargin), `${data.revenue ? number(data.grossMargin / data.revenue * 100, 1) : '0.0'}% sobre ingresos`, 'chart', 'green')}${kpiCard('Ticket promedio', money(data.averageTicket), 'Ingreso promedio por operación', 'receipt', 'blue')}</div>
    <div class="grid grid-2"><section class="panel">${panelHead('Ingresos por día', 'Ventas en el periodo seleccionado')}${barsMarkup(data.dailySales)}</section><section class="panel">${panelHead('Productos más vendidos', 'Unidades registradas')}${data.topProducts.length ? data.topProducts.map((x) => `<div class="alert-row"><span class="alert-symbol">${icon('chef')}</span><span><b>${esc(x.name)}</b><small>Unidades vendidas</small></span><strong>${x.quantity}</strong></div>`).join('') : empty('Sin ventas', 'No hay productos vendidos en el periodo.')}</section></div>
    <div class="note" style="margin-top:15px">${icon('file')} Valorización actual del inventario: <strong>${money(data.inventoryValue)}</strong>. Alertas activas de stock: <strong>${data.alertsCount}</strong>. El margen es referencial y utiliza el costo actual de cada receta, no un costeo histórico por lote.</div>`;
}

async function renderAudit(target) {
  const records = await api.audit();
  target.innerHTML = `${pageHeading('Gobierno y control', 'Bitácora del sistema', 'Trazabilidad de operaciones administrativas, movimientos de stock, compras y ventas.')}
    <section class="panel">${panelHead('Registro de auditoría', `Últimas ${records.length} operaciones registradas`)}<div class="table-wrap"><table><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Entidad</th><th>Identificador</th><th>Detalle</th></tr></thead><tbody>${records.map((x) => `<tr><td>${dateTime(x.date)}</td><td><strong>${esc(x.actor)}</strong></td><td>${esc(x.role)}</td><td>${esc(x.action)}</td><td>${esc(x.entity)}</td><td>${esc(x.entityId)}</td><td>${esc(x.detail)}</td></tr>`).join('') || `<tr><td colspan="7">${empty('Sin eventos de auditoría', 'Las operaciones se registrarán conforme se utilicen los módulos transaccionales.')}</td></tr>`}</tbody></table></div></section>`;
}

function openDialog(title, body) {
  const dialog = document.querySelector('#app-dialog');
  if (!dialog) return;
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-body').innerHTML = body;
  dialog.showModal();
}
function closeDialog() { document.querySelector('#app-dialog')?.close(); }
function itemOptions(items, selected = '') { return items.map((x) => ({ value: x.id, label: `${x.name} (${number(x.stock, 3)} ${x.unit})` })); }
function addPurchaseLine() {
  const holder = document.querySelector('#purchase-lines'); if (!holder) return;
  const items = state.items;
  const index = holder.children.length + 1;
  const html = `<div class="line-item purchase-line"><div class="field"><label>Insumo</label><select name="itemId" required>${items.map((x) => `<option value="${x.id}">${esc(x.name)} · ${esc(x.unit)}</option>`).join('')}</select></div><div class="field"><label>Cantidad</label><input name="quantity" type="number" min="0.001" step="0.001" value="1" required></div><div class="field"><label>Costo unitario (S/)</label><input name="unitCost" type="number" min="0.01" step="0.01" value="${items[0]?.unitCost || 1}" required></div><button class="icon-button" type="button" data-action="remove-line" aria-label="Quitar línea">${icon('close')}</button></div>`;
  holder.insertAdjacentHTML('beforeend', html);
}
function addRecipeLine() {
  const holder = document.querySelector('#recipe-lines'); if (!holder) return;
  holder.insertAdjacentHTML('beforeend', `<div class="line-item recipe-line"><div class="field"><label>Insumo</label><select name="itemId" required>${state.items.map((x) => `<option value="${x.id}">${esc(x.name)} · ${esc(x.unit)}</option>`).join('')}</select></div><div class="field"><label>Cantidad por plato</label><input name="qty" type="number" min="0.0001" step="0.0001" value="0.05" required></div><div class="field"><label>Unidad</label><input value="Se toma del catálogo" disabled></div><button class="icon-button" type="button" data-action="remove-line" aria-label="Quitar insumo">${icon('close')}</button></div>`);
}

async function dialogMovement(type = 'ENTRADA') {
  const items = await api.items();
  openDialog(type === 'ENTRADA' ? 'Registrar entrada de almacén' : 'Registrar salida de almacén', `<form id="movement-form"><div class="form-stack">
    ${selectField('itemId', 'Insumo', itemOptions(items))}
    ${field('quantity', 'Cantidad', 'number', '', { min: .0001, step: .0001 })}
    ${type === 'ENTRADA' ? field('unitCost', 'Costo unitario (S/)', 'number', '', { min: .01, step: .01 }) : ''}
    ${type === 'ENTRADA' ? field('lot', 'Lote (opcional)', 'text', '', { required: false, placeholder: 'Código de lote' }) : ''}
    ${field('reference', 'Referencia', 'text', '', { placeholder: type === 'ENTRADA' ? 'Ej. AJUSTE-ALMACEN' : 'Ej. CONSUMO-INTERNO' })}
    ${field('reason', 'Motivo del movimiento', 'textarea', '', { placeholder: 'Explique el motivo del movimiento.' })}
    <div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-dialog">Cancelar</button><button class="btn" type="submit">Confirmar ${type.toLowerCase()}</button></div>
  </div><input type="hidden" name="type" value="${type}"></form>`);
}
async function dialogSupplier() {
  openDialog('Registrar proveedor', `<form id="supplier-form"><div class="form-grid">
    ${field('ruc', 'RUC (11 dígitos)', 'text', '', { placeholder: '20600000000', hint: 'Se valida longitud, formato numérico y unicidad.' })}
    ${field('businessName', 'Razón social', 'text', '', { placeholder: 'Nombre legal de la empresa' })}
    ${field('tradeName', 'Nombre comercial', 'text', '', { required: false })}
    ${field('contact', 'Persona de contacto', 'text', '', {})}
    ${field('phone', 'Teléfono', 'tel', '', { required: false, placeholder: '987654321' })}
    ${field('email', 'Correo electrónico', 'email', '', { required: false })}
    <div class="span-2">${field('address', 'Dirección', 'text', '', {})}</div>
  </div><div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-dialog">Cancelar</button><button class="btn" type="submit">Guardar proveedor</button></div></form>`);
}
async function dialogPurchase() {
  const [suppliers, items] = await Promise.all([api.suppliers(), api.items()]); state.suppliers = suppliers; state.items = items;
  openDialog('Emitir orden de compra', `<form id="purchase-form"><div class="form-stack">
    ${selectField('supplierId', 'Proveedor', suppliers.map((x) => ({ value: x.id, label: `${x.businessName} · RUC ${x.ruc}` })))}
    <div><div class="form-section-title">Detalle de la compra</div><div class="line-items" id="purchase-lines"></div><div style="margin-top:10px"><button type="button" class="btn btn-secondary btn-small" data-action="add-purchase-line">${icon('plus')} Agregar insumo</button></div></div>
    <div class="note">${icon('file')} El sistema calcula automáticamente subtotal, IGV (18%) y total en soles. El stock se modifica únicamente al confirmar la recepción.</div>
    <div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-dialog">Cancelar</button><button class="btn" type="submit">Emitir orden</button></div>
  </div></form>`);
  addPurchaseLine();
}
async function dialogRecipe() {
  const [items] = await Promise.all([api.items()]); state.items = items;
  openDialog('Crear receta de plato', `<form id="recipe-form"><div class="form-stack">
    <div class="form-grid">${field('name', 'Nombre del plato', 'text', '', {})}${field('category', 'Categoría', 'text', 'Platos principales', {})}${field('price', 'Precio de venta (S/)', 'number', '', { min: .01, step: .01 })}<div class="span-2">${field('description', 'Descripción', 'text', '', { required: false })}</div></div>
    <div><div class="form-section-title">Escandallo por unidad vendida</div><div id="recipe-lines" class="line-items"></div><div style="margin-top:10px"><button type="button" class="btn btn-secondary btn-small" data-action="add-recipe-line">${icon('plus')} Agregar insumo</button></div></div>
    <div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-dialog">Cancelar</button><button class="btn" type="submit">Guardar receta</button></div>
  </div></form>`);
  addRecipeLine();
}
async function dialogReturn() {
  const [items, suppliers] = await Promise.all([api.items(), api.suppliers()]); state.items = items; state.suppliers = suppliers;
  openDialog('Registrar merma o devolución', `<form id="return-form"><div class="form-grid">
    ${selectField('type', 'Tipo de registro', [{ value: 'MERMA', label: 'Merma / producto no apto' }, { value: 'DEVOLUCION', label: 'Devolución a proveedor' }])}
    ${selectField('itemId', 'Insumo', itemOptions(items))}
    ${field('quantity', 'Cantidad afectada', 'number', '', { min: .0001, step: .0001 })}
    ${field('lot', 'Lote', 'text', items[0]?.lot || '', {})}
    ${selectField('supplierId', 'Proveedor relacionado', [{ value: '', label: 'No especificado' }, ...suppliers.map((x) => ({ value: x.id, label: x.businessName }))], '', false)}
    ${field('reason', 'Motivo', 'text', '', {})}
  </div><div class="form-section-title" style="margin-top:18px">Evaluación del proveedor (0–100)</div><div class="form-grid cols-3">
    ${field('compliance', 'Cumplimiento', 'number', '90', { min: 0, max: 100 })}
    ${field('delivery', 'Puntualidad', 'number', '90', { min: 0, max: 100 })}
    ${field('quality', 'Calidad', 'number', '90', { min: 0, max: 100 })}
  </div><small class="muted">Ponderación: calidad 40%, cumplimiento 30%, puntualidad 30%. Seleccione proveedor para guardar la evaluación.</small>
  <div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-dialog">Cancelar</button><button class="btn" type="submit">Registrar salida y evaluación</button></div></form>`);
}
function dialogComplaintManage(id) {
  api.complaints().then((records) => {
    const record = records.find((x) => x.id === id); if (!record) return toast('No se encontró el reclamo.', 'error');
    openDialog(`Gestionar ${record.id}`, `<form id="complaint-manage-form"><p class="muted" style="font-size:11px;line-height:1.6">${esc(record.customerName)} · ${esc(record.type)}<br>${esc(record.detail)}</p><input type="hidden" name="id" value="${esc(id)}">${selectField('status', 'Estado', [{ value: 'Registrado', label: 'Registrado' }, { value: 'En revisión', label: 'En revisión' }, { value: 'Atendido', label: 'Atendido' }, { value: 'No procede', label: 'No procede' }], record.status)}${field('response', 'Respuesta al cliente', 'textarea', record.response || '', { required: false, placeholder: 'Escriba la respuesta o las acciones realizadas.' })}<div class="form-actions"><button type="button" class="btn btn-secondary" data-action="close-dialog">Cancelar</button><button class="btn" type="submit">Guardar actualización</button></div></form>`);
  }).catch(showError);
}

function startAlertMonitor() {
  if (alertMonitor) clearInterval(alertMonitor);
  if (![ROLE.manager, ROLE.worker].includes(state.user?.role)) return;
  const poll = async (notify = false) => {
    if (!state.user) return;
    try {
      const alerts = await api.alerts();
      const ids = new Set(alerts.map((item) => item.id));
      const previous = state.lastAlertIds;
      state.alertCount = alerts.length;
      const nav = document.querySelector('.nav-link[data-view="alerts"]');
      if (nav) {
        let badge = nav.querySelector('.nav-count');
        if (alerts.length && !badge) { badge = document.createElement('span'); badge.className = 'nav-count'; nav.append(badge); }
        if (badge) { badge.textContent = String(alerts.length); badge.hidden = !alerts.length; }
      }
      if (notify && previous) {
        const added = alerts.filter((item) => !previous.has(item.id));
        if (added.length) {
          toast(`${added.length} nueva(s) alerta(s) de stock mínimo: ${added.map((x) => x.name).join(', ')}.`, 'error');
          if (state.view === 'dashboard') await renderCurrentView();
        }
      }
      state.lastAlertIds = ids;
    } catch { /* El panel no debe interrumpirse si una consulta de alertas falla. */ }
  };
  poll(false);
  alertMonitor = setInterval(() => poll(true), 15000);
}

async function logout() {
  if (alertMonitor) { clearInterval(alertMonitor); alertMonitor = null; }
  try { await api.logout(); } catch { /* La sesión local se limpia aunque el servidor haya reiniciado. */ }
  session.clear(); state.user = null; state.cart = []; state.lastSale = null; renderLogin();
}

async function handleClick(event) {
  const demo = event.target.closest('[data-demo]');
  if (demo) {
    const [username, password] = demo.dataset.demo.split('|');
    document.querySelector('#username').value = username;
    document.querySelector('#password').value = password;
    document.querySelector('#password').focus();
    return;
  }
  const view = event.target.closest('[data-view]');
  if (view) { await setView(view.dataset.view); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    switch (action) {
      case 'logout': await logout(); break;
      case 'public-complaint': renderPublicComplaint(); break;
      case 'public-track': renderPublicTrack(); break;
      case 'back-login': renderLogin(); break;
      case 'go-login': location.hash = 'login'; renderLogin(); break;
      case 'close-dialog': closeDialog(); break;
      case 'go-dashboard': await setView('dashboard'); break;
      case 'go-alerts': await setView('alerts'); break;
      case 'go-kardex': await setView('kardex'); break;
      case 'open-movement': await dialogMovement(button.dataset.type || 'ENTRADA'); break;
      case 'open-supplier': await dialogSupplier(); break;
      case 'open-purchase': await dialogPurchase(); break;
      case 'open-recipe': await dialogRecipe(); break;
      case 'open-return': await dialogReturn(); break;
      case 'add-purchase-line': addPurchaseLine(); break;
      case 'add-recipe-line': addRecipeLine(); break;
      case 'remove-line': button.closest('.line-item')?.remove(); break;
      case 'receive-order':
        if (!confirm(`¿Confirmar recepción de ${id}? Esta operación aumentará el stock y generará movimientos de Kardex.`)) return;
        await api.receivePurchaseOrder(id); toast(`Orden ${id} recibida. Stock y Kardex actualizados.`); await renderCurrentView(); break;
      case 'cart-add': {
        const line = state.cart.find((x) => x.recipeId === id);
        if (line) line.quantity += 1; else state.cart.push({ recipeId: id, quantity: 1 });
        await renderCurrentView(); break;
      }
      case 'cart-inc': {
        const line = state.cart.find((x) => x.recipeId === id); if (line) line.quantity = Math.min(100, line.quantity + 1);
        await renderCurrentView(); break;
      }
      case 'cart-dec': {
        const line = state.cart.find((x) => x.recipeId === id); if (line) line.quantity -= 1;
        state.cart = state.cart.filter((x) => x.quantity > 0); await renderCurrentView(); break;
      }
      case 'clear-cart': state.cart = []; await renderCurrentView(); break;
      case 'print-ticket': window.print(); break;
      case 'view-sales': document.querySelector('#sales-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'complaint-manage': dialogComplaintManage(id); break;
      case 'request-status': await api.updateStatus('requests', id, button.dataset.status); toast(`Solicitud ${id}: ${button.dataset.status}.`); await renderCurrentView(); break;
      case 'copy-public-link': await navigator.clipboard.writeText(`${location.origin}/#public-complaint`); toast('Enlace público copiado.'); break;
      default: break;
    }
  } catch (error) { showError(error); }
}

async function handleSubmit(event) {
  const form = event.target;
  const formId = form.id;
  if (!formId) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form).entries());
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    if (formId === 'login-form') {
      const response = await api.login(values.username, values.password);
      session.token = response.token;
      state.user = response.user;
      const hashView = location.hash.slice(1);
      const validViews = navGroups.flatMap((x) => x.links).filter((x) => x.roles.includes(state.user.role)).map((x) => x.id);
      state.view = validViews.includes(hashView) ? hashView : 'dashboard';
      await renderShell();
      startAlertMonitor();
      toast(`Bienvenido, ${state.user.name}.`);
    } else if (formId === 'movement-form') {
      await api.movement({ ...values, quantity: Number(values.quantity), unitCost: values.unitCost ? Number(values.unitCost) : undefined });
      closeDialog(); toast('Movimiento registrado y saldo recalculado.'); await renderCurrentView();
    } else if (formId === 'supplier-form') {
      await api.createSupplier(values); closeDialog(); toast('Proveedor registrado correctamente.'); await renderCurrentView();
    } else if (formId === 'purchase-form') {
      const lines = [...form.querySelectorAll('.purchase-line')].map((row) => ({ itemId: row.querySelector('[name="itemId"]').value, quantity: Number(row.querySelector('[name="quantity"]').value), unitCost: Number(row.querySelector('[name="unitCost"]').value) }));
      await api.createPurchaseOrder({ supplierId: values.supplierId, items: lines });
      closeDialog(); toast('Orden emitida. El stock cambiará al confirmar la recepción.'); await renderCurrentView();
    } else if (formId === 'recipe-form') {
      const ingredients = [...form.querySelectorAll('.recipe-line')].map((row) => ({ itemId: row.querySelector('[name="itemId"]').value, qty: Number(row.querySelector('[name="qty"]').value) }));
      await api.createRecipe({ ...values, price: Number(values.price), ingredients });
      closeDialog(); toast('Receta y escandallo guardados.'); await renderCurrentView();
    } else if (formId === 'return-form') {
      const payload = { ...values, quantity: Number(values.quantity), compliance: Number(values.compliance), delivery: Number(values.delivery), quality: Number(values.quality) };
      if (!payload.supplierId) { delete payload.supplierId; delete payload.compliance; delete payload.delivery; delete payload.quality; }
      await api.createReturn(payload); closeDialog(); toast('Salida por merma/devolución registrada en Kardex.'); await renderCurrentView();
    } else if (formId === 'sale-form') {
      if (!state.cart.length) throw new Error('Agregue al menos un plato al pedido.');
      const sale = await api.createSale({ customer: values.customer || 'Mostrador', payment: values.payment, discount: Number(values.discount || 0), items: state.cart });
      state.lastSale = sale; state.cart = []; toast(`Venta ${sale.id} confirmada. Se descontaron los insumos del escandallo.`); await renderCurrentView();
    } else if (formId === 'incident-form') {
      await api.createIncident(values); toast('Incidencia registrada.'); await renderCurrentView();
    } else if (formId === 'stock-report-form') {
      await api.createStockReport({ ...values, quantity: Number(values.quantity) }); toast('Reporte de desabastecimiento enviado.'); await renderCurrentView();
    } else if (formId === 'request-form') {
      await api.createRequest(values); toast('Solicitud enviada a gerencia.'); await renderCurrentView();
    } else if (formId === 'public-complaint-form') {
      const result = await api.publicComplaint(values);
      form.reset(); document.querySelector('#public-result').innerHTML = `<div class="note success" style="margin-top:17px">${icon('check')} <span><strong>Reclamo registrado correctamente.</strong><br>Número: <b>${esc(result.id)}</b><br>Código de seguimiento: <b>${esc(result.trackingCode)}</b><br>Guarde ambos datos para consultar el estado de su caso.</span></div>`;
    } else if (formId === 'public-track-form') {
      const result = await api.trackComplaint(values.complaintId, values.trackingCode);
      document.querySelector('#public-result').innerHTML = `<div class="panel" style="margin-top:17px"><span class="eyebrow">Resultado de búsqueda</span><h2 style="margin:8px 0">${esc(result.id)}</h2><p style="font-size:11px;color:var(--muted)">Tipo: ${esc(result.type)} · Registrado: ${dateTime(result.date)}</p><div style="margin-top:10px">Estado: ${pill(result.status)}</div>${result.response ? `<div class="note" style="margin-top:12px">${esc(result.response)}</div>` : ''}</div>`;
    } else if (formId === 'kpi-filter') {
      const data = await api.kpis(values.from, values.to);
      document.querySelector('#kpi-content').innerHTML = kpiContent(data);
    } else if (formId === 'complaint-manage-form') {
      await api.updateStatus('complaints', values.id, values.status, values.response);
      closeDialog(); toast('Estado y respuesta del reclamo actualizados.'); await renderCurrentView();
    }
  } catch (error) {
    showError(error);
    if (submit) submit.disabled = false;
  }
}

function installDelegates() {
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('change', async (event) => {
    const target = event.target;
    try {
      if (target.matches('#inventory-filter, #inventory-search')) {
        const query = (document.querySelector('#inventory-search')?.value || '').trim().toLowerCase();
        const mode = document.querySelector('#inventory-filter')?.value || 'all';
        document.querySelectorAll('#inventory-rows tr[data-row-search]').forEach((row) => {
          const matchesText = row.dataset.rowSearch.includes(query);
          const matchesStock = mode === 'all' || (mode === 'low' ? row.dataset.low === 'true' : row.dataset.low === 'false');
          row.hidden = !(matchesText && matchesStock);
        });
      }
      if (target.matches('#kardex-item-filter, #kardex-type-filter')) {
        const records = await api.kardex({ itemId: document.querySelector('#kardex-item-filter').value, type: document.querySelector('#kardex-type-filter').value });
        document.querySelector('#kardex-rows').innerHTML = kardexRows(records);
      }
      if (target.matches('[data-status-collection]')) {
        const collection = target.dataset.statusCollection;
        const status = target.value;
        await api.updateStatus(collection, target.dataset.statusId, status);
        toast('Estado actualizado correctamente.');
      }
      if (target.matches('#return-form [name="itemId"]')) {
        const item = state.items.find((x) => x.id === target.value);
        const lot = document.querySelector('#return-form [name="lot"]'); if (item && lot) lot.value = item.lot;
      }
      if (target.matches('.purchase-line [name="itemId"]')) {
        const item = state.items.find((x) => x.id === target.value);
        const cost = target.closest('.purchase-line')?.querySelector('[name="unitCost"]');
        if (item && cost) cost.value = item.unitCost;
      }
    } catch (error) { showError(error); }
  });
  window.addEventListener('session:expired', () => { state.user = null; renderLogin(); toast('La sesión expiró. Vuelva a ingresar.', 'error'); });
}

async function bootstrap() {
  installDelegates();
  if (location.hash === '#public-complaint') { renderPublicComplaint(); return; }
  if (location.hash === '#public-track') { renderPublicTrack(); return; }
  if (location.hash === '#login') { renderLogin(); return; }
  if (!session.token) { renderLanding(); return; }
  try {
    state.user = await api.me();
    const desiredView = location.hash.slice(1);
    const valid = navGroups.flatMap((x) => x.links).filter((x) => x.roles.includes(state.user.role)).map((x) => x.id);
    state.view = valid.includes(desiredView) ? desiredView : 'dashboard';
    await renderShell();
    startAlertMonitor();
  } catch {
    session.clear(); renderLogin();
  }
}

bootstrap();
