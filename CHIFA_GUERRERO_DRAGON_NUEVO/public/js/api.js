const API_BASE = '/api';
const TOKEN_KEY = 'gdr.session.token';

export const session = {
  get token() { return sessionStorage.getItem(TOKEN_KEY); },
  set token(value) { value ? sessionStorage.setItem(TOKEN_KEY, value) : sessionStorage.removeItem(TOKEN_KEY); },
  clear() { sessionStorage.removeItem(TOKEN_KEY); }
};

export class ApiError extends Error {
  constructor(message, status = 500, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (session.token) headers.set('Authorization', `Bearer ${session.token}`);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.body === undefined || options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor local. Compruebe que siga iniciado.', 0, 'NETWORK_ERROR');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    if (response.status === 401 && session.token && !path.startsWith('/auth/login')) {
      session.clear();
      window.dispatchEvent(new CustomEvent('session:expired'));
    }
    throw new ApiError(payload.error || `Error HTTP ${response.status}`, response.status, payload.code);
  }
  return payload.data;
}

export const api = {
  health: () => request('/health'),
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST', body: {} }),
  me: () => request('/auth/me'),
  overview: () => request('/overview'),
  items: (search = '') => request(`/items${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  kardex: (filters = {}) => request(`/kardex?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()}`),
  movement: (data) => request('/kardex', { method: 'POST', body: data }),
  alerts: () => request('/alerts'),
  suppliers: () => request('/suppliers'),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: data }),
  purchaseOrders: () => request('/purchase-orders'),
  createPurchaseOrder: (data) => request('/purchase-orders', { method: 'POST', body: data }),
  receivePurchaseOrder: (id) => request(`/purchase-orders/${encodeURIComponent(id)}/receive`, { method: 'POST', body: {} }),
  recipes: () => request('/recipes'),
  createRecipe: (data) => request('/recipes', { method: 'POST', body: data }),
  updateRecipe: (id, data) => request(`/recipes/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
  returns: () => request('/returns'),
  createReturn: (data) => request('/returns', { method: 'POST', body: data }),
  kpis: (from, to) => request(`/kpis?${new URLSearchParams({ from, to })}`),
  sales: () => request('/sales'),
  createSale: (data) => request('/sales', { method: 'POST', body: data }),
  incidents: () => request('/incidents'),
  createIncident: (data) => request('/incidents', { method: 'POST', body: data }),
  stockReports: () => request('/stock-reports'),
  createStockReport: (data) => request('/stock-reports', { method: 'POST', body: data }),
  requests: () => request('/requests'),
  createRequest: (data) => request('/requests', { method: 'POST', body: data }),
  complaints: () => request('/complaints'),
  updateStatus: (collection, id, status, response = '') => request(`/${collection}/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status, response } }),
  audit: () => request('/audit'),
  publicComplaint: (data) => request('/public/complaints', { method: 'POST', body: data }),
  trackComplaint: (id, code) => request(`/public/complaints/track?${new URLSearchParams({ id, code })}`)
};
