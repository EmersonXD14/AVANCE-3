/** Reglas del dominio. No depende de HTTP ni de componentes de interfaz. */
import { randomBytes } from 'node:crypto';

export class DomainError extends Error {
  constructor(message, status = 400, code = 'BUSINESS_RULE') {
    super(message); this.name = 'DomainError'; this.status = status; this.code = code;
  }
}

export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const makeId = (prefix) => `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(5).toString('hex').toUpperCase()}`;
export const asNumber = (value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new DomainError(`${label}: valor fuera del rango permitido.`);
  return n;
};
const requiredText = (value, label, max = 180) => {
  const text = String(value ?? '').trim();
  if (!text || text.length > max) throw new DomainError(`${label} es obligatorio y debe tener como máximo ${max} caracteres.`);
  return text;
};
const findItem = (state, itemId) => {
  const item = state.items.find((x) => x.id === itemId && x.active !== false);
  if (!item) throw new DomainError('El insumo seleccionado no existe o está inactivo.', 404, 'ITEM_NOT_FOUND');
  return item;
};
const findSupplier = (state, supplierId) => {
  const supplier = state.suppliers.find((x) => x.id === supplierId && x.active !== false);
  if (!supplier) throw new DomainError('El proveedor seleccionado no existe o está inactivo.', 404, 'SUPPLIER_NOT_FOUND');
  return supplier;
};

export function recordMovement(state, payload, actor) {
  const item = findItem(state, payload.itemId);
  const type = String(payload.type || '').toUpperCase();
  if (!['ENTRADA', 'SALIDA'].includes(type)) throw new DomainError('Tipo de movimiento no válido.');
  const quantity = asNumber(payload.quantity, 'Cantidad', { min: 0.0001, max: 1000000 });
  const before = item.stock;
  const after = type === 'ENTRADA' ? before + quantity : before - quantity;
  if (after < -1e-9) throw new DomainError(`Stock insuficiente de ${item.name}. Disponible: ${before} ${item.unit}.`, 409, 'INSUFFICIENT_STOCK');
  item.stock = Math.round(after * 10000) / 10000;
  if (payload.unitCost !== undefined && type === 'ENTRADA') item.unitCost = roundMoney(asNumber(payload.unitCost, 'Costo unitario', { min: 0.01, max: 100000 }));
  if (payload.lot) item.lot = requiredText(payload.lot, 'Lote', 60);
  const movement = {
    id: makeId('KDX'), date: new Date().toISOString(), itemId: item.id, itemName: item.name,
    type, quantity, before, after: item.stock, unitCost: item.unitCost,
    reference: requiredText(payload.reference || 'MOV-MANUAL', 'Referencia', 80),
    reason: requiredText(payload.reason, 'Motivo', 300), user: actor.name
  };
  state.kardex.push(movement);
  return { item, movement };
}

export function createSupplier(state, payload) {
  const ruc = String(payload.ruc ?? '').trim();
  if (!/^\d{11}$/.test(ruc)) throw new DomainError('El RUC debe contener exactamente 11 dígitos numéricos.');
  if (state.suppliers.some((x) => x.ruc === ruc)) throw new DomainError('Ya existe un proveedor registrado con ese RUC.', 409, 'DUPLICATE_RUC');
  const phone = String(payload.phone ?? '').trim();
  if (phone && !/^\d{7,15}$/.test(phone)) throw new DomainError('El teléfono debe contener entre 7 y 15 dígitos.');
  const email = String(payload.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError('El correo electrónico no tiene un formato válido.');
  const supplier = {
    id: makeId('PRO'), ruc,
    businessName: requiredText(payload.businessName, 'Razón social', 160),
    tradeName: String(payload.tradeName ?? '').trim(),
    contact: requiredText(payload.contact, 'Contacto', 100), phone, email,
    address: requiredText(payload.address, 'Dirección', 180), active: true, evaluations: []
  };
  state.suppliers.push(supplier);
  return supplier;
}

export function createPurchaseOrder(state, payload, actor) {
  const supplier = findSupplier(state, payload.supplierId);
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 30) throw new DomainError('La orden debe contener entre 1 y 30 líneas de detalle.');
  const lines = payload.items.map((line) => {
    const item = findItem(state, line.itemId);
    return {
      itemId: item.id, itemName: item.name,
      quantity: asNumber(line.quantity, `Cantidad de ${item.name}`, { min: 0.0001, max: 100000 }),
      unitCost: roundMoney(asNumber(line.unitCost, `Costo unitario de ${item.name}`, { min: 0.01, max: 100000 }))
    };
  });
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0));
  const taxRate = 0.18;
  const tax = roundMoney(subtotal * taxRate);
  const order = {
    id: makeId('OC'), supplierId: supplier.id, supplierName: supplier.businessName,
    issueDate: new Date().toISOString(), status: 'Emitida', currency: 'PEN', taxRate,
    items: lines, subtotal, tax, total: roundMoney(subtotal + tax), issuedBy: actor.name
  };
  state.purchaseOrders.push(order);
  return order;
}

export function receivePurchaseOrder(state, orderId, actor) {
  const order = state.purchaseOrders.find((x) => x.id === orderId);
  if (!order) throw new DomainError('Orden de compra no encontrada.', 404);
  if (order.status === 'Recibida') throw new DomainError('Esta orden ya fue recibida; no se puede duplicar el ingreso al Kardex.', 409, 'ALREADY_RECEIVED');
  if (order.status !== 'Emitida') throw new DomainError('Solo se pueden recibir órdenes emitidas.', 409);
  // Se validan todas las líneas antes de mutar; la operación completa está dentro de una transacción.
  for (const line of order.items) findItem(state, line.itemId);
  for (const line of order.items) {
    recordMovement(state, {
      type: 'ENTRADA', itemId: line.itemId, quantity: line.quantity,
      unitCost: line.unitCost, reference: order.id,
      reason: `Recepción de orden de compra ${order.id}`
    }, actor);
  }
  order.status = 'Recibida';
  order.receivedAt = new Date().toISOString();
  order.receivedBy = actor.name;
  return order;
}

export function saveRecipe(state, payload, recipeId = null) {
  const name = requiredText(payload.name, 'Nombre del plato', 100);
  const price = roundMoney(asNumber(payload.price, 'Precio de venta', { min: 0.01, max: 10000 }));
  if (!Array.isArray(payload.ingredients) || payload.ingredients.length < 1 || payload.ingredients.length > 30) throw new DomainError('La receta debe incluir entre 1 y 30 insumos.');
  const seen = new Set();
  const ingredients = payload.ingredients.map((line) => {
    const item = findItem(state, line.itemId);
    if (seen.has(item.id)) throw new DomainError(`El insumo ${item.name} está repetido en la receta.`);
    seen.add(item.id);
    return { itemId: item.id, qty: asNumber(line.qty, `Gramaje de ${item.name}`, { min: 0.0001, max: 10000 }) };
  });
  const existing = recipeId ? state.recipes.find((x) => x.id === recipeId) : null;
  if (recipeId && !existing) throw new DomainError('Receta no encontrada.', 404);
  const recipe = {
    id: existing?.id || makeId('RECETA'), name, category: requiredText(payload.category || 'Platos principales', 'Categoría', 80),
    price, description: String(payload.description ?? '').trim(), active: payload.active !== false, ingredients
  };
  if (existing) Object.assign(existing, recipe); else state.recipes.push(recipe);
  return recipe;
}

export function createSale(state, payload, actor) {
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 50) throw new DomainError('El pedido debe incluir al menos un plato.');
  const quantityByItem = new Map();
  const lines = payload.items.map((line) => {
    const recipe = state.recipes.find((x) => x.id === line.recipeId && x.active !== false);
    if (!recipe) throw new DomainError('Uno de los platos ya no está disponible.', 409);
    const quantity = asNumber(line.quantity, `Cantidad de ${recipe.name}`, { min: 1, max: 100 });
    if (!Number.isInteger(quantity)) throw new DomainError('Las cantidades de platos deben ser números enteros.');
    for (const component of recipe.ingredients) {
      const current = quantityByItem.get(component.itemId) || 0;
      quantityByItem.set(component.itemId, current + component.qty * quantity);
    }
    return { recipeId: recipe.id, name: recipe.name, quantity, unitPrice: recipe.price };
  });
  for (const [itemId, requiredQty] of quantityByItem) {
    const item = findItem(state, itemId);
    if (item.stock + 1e-9 < requiredQty) throw new DomainError(`No hay stock suficiente de ${item.name}. Requerido: ${requiredQty.toFixed(3)} ${item.unit}; disponible: ${item.stock} ${item.unit}.`, 409, 'INSUFFICIENT_STOCK');
  }
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const discount = roundMoney(asNumber(payload.discount ?? 0, 'Descuento', { min: 0, max: subtotal * 0.3 }));
  const total = roundMoney(subtotal - discount);
  const payment = requiredText(payload.payment || 'Efectivo', 'Método de pago', 40);
  if (!['Efectivo', 'Tarjeta', 'Yape / Plin'].includes(payment)) throw new DomainError('Método de pago no permitido.');
  const sale = {
    id: makeId('VTA'), date: new Date().toISOString(), customer: String(payload.customer || 'Mostrador').trim().slice(0, 100),
    cashier: actor.name, payment, items: lines, subtotal, discount, tax: 0, total, stockApplied: true
  };
  // La salida por receta y la venta quedan dentro de la misma unidad transaccional.
  for (const [itemId, requiredQty] of quantityByItem) {
    const item = findItem(state, itemId);
    recordMovement(state, {
      type: 'SALIDA', itemId, quantity: requiredQty,
      reference: sale.id, reason: `Consumo por venta ${sale.id}`
    }, actor);
  }
  state.sales.push(sale);
  return sale;
}

export function createReturn(state, payload, actor) {
  const item = findItem(state, payload.itemId);
  const quantity = asNumber(payload.quantity, 'Cantidad', { min: 0.0001, max: 100000 });
  const type = String(payload.type || 'MERMA').toUpperCase();
  if (!['MERMA', 'DEVOLUCION'].includes(type)) throw new DomainError('Tipo de devolución o merma no válido.');
  const supplier = payload.supplierId ? findSupplier(state, payload.supplierId) : null;
  if (item.stock < quantity) throw new DomainError(`Stock insuficiente para registrar la salida. Disponible: ${item.stock} ${item.unit}.`, 409);
  const lot = requiredText(payload.lot || item.lot, 'Lote', 60);
  const reason = requiredText(payload.reason, 'Motivo', 300);
  const evaluation = supplier ? {
    compliance: asNumber(payload.compliance, 'Cumplimiento', { min: 0, max: 100 }),
    delivery: asNumber(payload.delivery, 'Puntualidad', { min: 0, max: 100 }),
    quality: asNumber(payload.quality, 'Calidad', { min: 0, max: 100 })
  } : null;
  const record = {
    id: makeId('DEV'), date: new Date().toISOString(), itemId: item.id, itemName: item.name,
    lot, quantity, type, reason, supplierId: supplier?.id || null,
    supplierName: supplier?.businessName || 'No especificado', evaluation, registeredBy: actor.name
  };
  recordMovement(state, {
    type: 'SALIDA', itemId: item.id, quantity,
    reference: record.id, reason: `${type}: ${reason}`
  }, actor);
  if (supplier && evaluation) {
    supplier.evaluations ||= [];
    supplier.evaluations.push({ ...evaluation, date: record.date, returnId: record.id });
  }
  state.returns.push(record);
  return record;
}

export function supplierScore(supplier) {
  const evaluations = supplier.evaluations || [];
  if (!evaluations.length) return null;
  const average = evaluations.reduce((sum, item) => sum + item.compliance * 0.30 + item.delivery * 0.30 + item.quality * 0.40, 0) / evaluations.length;
  return Math.round(average * 10) / 10;
}

export function stockAlerts(state) {
  return state.items.filter((item) => item.active !== false && item.stock <= item.minStock)
    .map((item) => ({ ...item, deficit: Math.max(0, item.minStock - item.stock), severity: item.stock <= item.minStock * 0.5 ? 'Crítica' : 'Alta' }))
    .sort((a, b) => a.stock / Math.max(a.minStock, 0.0001) - b.stock / Math.max(b.minStock, 0.0001));
}

export function kpis(state, from, to) {
  const start = from ? new Date(`${from}T00:00:00-05:00`) : new Date(Date.now() - 29 * 86400000);
  const end = to ? new Date(`${to}T23:59:59.999-05:00`) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new DomainError('El rango de fechas no es válido.');
  const sales = state.sales.filter((sale) => {
    const date = new Date(sale.date);
    return date >= start && date <= end;
  });
  const revenue = roundMoney(sales.reduce((sum, sale) => sum + sale.total, 0));
  const costByRecipe = new Map(state.recipes.map((recipe) => [recipe.id, recipe.ingredients.reduce((sum, part) => {
    const item = state.items.find((x) => x.id === part.itemId);
    return sum + (item ? item.unitCost * part.qty : 0);
  }, 0)]));
  const estimatedCost = roundMoney(sales.reduce((sum, sale) => sum + sale.items.reduce((lineSum, line) => lineSum + (costByRecipe.get(line.recipeId) || 0) * line.quantity, 0), 0));
  const inventoryValue = roundMoney(state.items.reduce((sum, item) => sum + item.stock * item.unitCost, 0));
  const dayMap = new Map();
  for (const sale of sales) {
    const day = new Date(sale.date).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    dayMap.set(day, (dayMap.get(day) || 0) + sale.total);
  }
  const dailySales = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total: roundMoney(total) }));
  const soldByRecipe = new Map();
  sales.forEach((sale) => sale.items.forEach((line) => soldByRecipe.set(line.name, (soldByRecipe.get(line.name) || 0) + line.quantity)));
  const topProducts = [...soldByRecipe.entries()].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  return {
    from: start.toISOString(), to: end.toISOString(), orderCount: sales.length,
    revenue, estimatedCost, grossMargin: roundMoney(revenue - estimatedCost),
    averageTicket: sales.length ? roundMoney(revenue / sales.length) : 0,
    inventoryValue, alertsCount: stockAlerts(state).length,
    dailySales, topProducts
  };
}

export function createComplaint(state, payload) {
  const customerName = requiredText(payload.customerName, 'Nombre del cliente', 100);
  const email = String(payload.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError('El correo no tiene un formato válido.');
  const type = requiredText(payload.type, 'Tipo', 40);
  if (!['Atención', 'Producto', 'Delivery', 'Cobro', 'Otro'].includes(type)) throw new DomainError('Tipo de reclamo no válido.');
  const detail = requiredText(payload.detail, 'Detalle', 1200);
  let trackingCode;
  do { trackingCode = `GDR-${randomBytes(5).toString('hex').toUpperCase()}`; }
  while (state.complaints.some((record) => record.trackingCode === trackingCode));
  const complaint = { id: makeId('REC'), trackingCode, date: new Date().toISOString(), customerName, email, type, detail, status: 'Registrado', response: '' };
  state.complaints.push(complaint);
  return complaint;
}

export function publicTrackComplaint(state, id, code) {
  const complaint = state.complaints.find((x) => x.id.toLowerCase() === String(id).trim().toLowerCase() && x.trackingCode.toLowerCase() === String(code).trim().toLowerCase());
  if (!complaint) throw new DomainError('No se encontró un reclamo con esos datos de seguimiento.', 404);
  return { id: complaint.id, date: complaint.date, type: complaint.type, status: complaint.status, response: complaint.response || '' };
}

export function setOperationalStatus(state, collection, id, status, response = '') {
  const allowed = {
    incidents: ['Pendiente', 'En atención', 'Atendida'],
    stockReports: ['Pendiente', 'En atención', 'Atendido'],
    requests: ['Pendiente', 'Aprobada', 'Rechazada'],
    complaints: ['Registrado', 'En revisión', 'Atendido', 'No procede']
  };
  if (!allowed[collection] || !allowed[collection].includes(status)) throw new DomainError('Estado no permitido.');
  const record = state[collection].find((x) => x.id === id);
  if (!record) throw new DomainError('Registro no encontrado.', 404);
  record.status = status;
  if (collection === 'complaints') record.response = String(response || '').trim().slice(0, 1000);
  record.updatedAt = new Date().toISOString();
  return record;
}
