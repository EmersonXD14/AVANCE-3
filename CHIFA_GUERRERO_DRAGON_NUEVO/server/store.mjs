/**
 * Almacén local del prototipo.
 * - La fuente de verdad inicial vive en seedState().
 * - Los cambios se guardan en JSON local mediante escritura atómica.
 * - No utiliza SQL, ORM ni servicios externos.
 * - La capa transaccional serializa mutaciones y revierte el estado si una operación falla.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../data/state.json');

const isoDaysAgo = (days, hour = 13) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export function seedState() {
  const items = [
    { id: 'INS-001', sku: 'MAT-ARZ-001', name: 'Arroz superior', category: 'Granos', unit: 'kg', stock: 45, minStock: 15, unitCost: 4.20, lot: 'ARZ-2609-A', location: 'Almacén seco', active: true },
    { id: 'INS-002', sku: 'MAT-POL-001', name: 'Pollo trozado', category: 'Proteínas', unit: 'kg', stock: 18, minStock: 8, unitCost: 11.50, lot: 'POL-2610-B', location: 'Cámara fría', active: true },
    { id: 'INS-003', sku: 'MAT-HUE-001', name: 'Huevo', category: 'Proteínas', unit: 'unidad', stock: 64, minStock: 24, unitCost: 0.65, lot: 'HUE-2610-A', location: 'Cámara fría', active: true },
    { id: 'INS-004', sku: 'MAT-CCH-001', name: 'Cebolla china', category: 'Vegetales', unit: 'kg', stock: 5, minStock: 6, unitCost: 4.00, lot: 'VEG-2610-C', location: 'Cámara fría', active: true },
    { id: 'INS-005', sku: 'MAT-SIL-001', name: 'Sillao', category: 'Condimentos', unit: 'litro', stock: 8, minStock: 3, unitCost: 9.50, lot: 'CON-2608-S', location: 'Almacén seco', active: true },
    { id: 'INS-006', sku: 'MAT-WAN-001', name: 'Lámina de wantán', category: 'Masas', unit: 'unidad', stock: 60, minStock: 24, unitCost: 0.40, lot: 'MAS-2610-W', location: 'Cámara fría', active: true },
    { id: 'INS-007', sku: 'MAT-ACE-001', name: 'Aceite vegetal', category: 'Condimentos', unit: 'litro', stock: 10, minStock: 4, unitCost: 8.00, lot: 'CON-2609-A', location: 'Almacén seco', active: true },
    { id: 'INS-008', sku: 'MAT-FID-001', name: 'Fideo chino', category: 'Masas', unit: 'kg', stock: 12, minStock: 5, unitCost: 6.50, lot: 'MAS-2609-F', location: 'Almacén seco', active: true },
    { id: 'INS-009', sku: 'MAT-LIM-001', name: 'Limón', category: 'Vegetales', unit: 'kg', stock: 8, minStock: 3, unitCost: 3.20, lot: 'VEG-2610-L', location: 'Cámara fría', active: true },
    { id: 'INS-010', sku: 'MAT-AZU-001', name: 'Azúcar', category: 'Granos', unit: 'kg', stock: 7, minStock: 3, unitCost: 4.50, lot: 'AZU-2609-A', location: 'Almacén seco', active: true },
    { id: 'INS-011', sku: 'MAT-INK-001', name: 'Inka Kola personal', category: 'Bebidas', unit: 'unidad', stock: 14, minStock: 12, unitCost: 4.00, lot: 'BEB-2610-I', location: 'Almacén seco', active: true },
    { id: 'INS-012', sku: 'MAT-MAI-001', name: 'Maicena', category: 'Condimentos', unit: 'kg', stock: 3, minStock: 2, unitCost: 5.00, lot: 'CON-2609-M', location: 'Almacén seco', active: true }
  ];

  const suppliers = [
    { id: 'PRO-001', ruc: '20601234567', businessName: 'Distribuidora Oriental S.A.C.', tradeName: 'Oriental Foods', contact: 'Lucía Paredes', phone: '987654321', email: 'ventas@orientalfoods.test', address: 'Cercado de Lima', active: true, evaluations: [{ compliance: 92, delivery: 88, quality: 95, date: isoDaysAgo(12) }] },
    { id: 'PRO-002', ruc: '20123456789', businessName: 'Avícola Los Andes E.I.R.L.', tradeName: 'Los Andes', contact: 'Marco Salas', phone: '946321785', email: 'pedidos@losandes.test', address: 'Ate, Lima', active: true, evaluations: [{ compliance: 86, delivery: 78, quality: 91, date: isoDaysAgo(20) }] },
    { id: 'PRO-003', ruc: '20567890123', businessName: 'Alimentos del Pacífico S.A.C.', tradeName: 'Pacífico', contact: 'Elena Rojas', phone: '955147258', email: 'comercial@pacifico.test', address: 'La Victoria, Lima', active: true, evaluations: [] }
  ];

  const recipes = [
    { id: 'RECETA-001', name: 'Arroz chaufa', category: 'Platos principales', price: 18, description: 'Arroz salteado al wok con pollo, huevo y cebolla china.', active: true, ingredients: [{ itemId: 'INS-001', qty: 0.25 }, { itemId: 'INS-002', qty: 0.10 }, { itemId: 'INS-003', qty: 0.5 }, { itemId: 'INS-004', qty: 0.05 }, { itemId: 'INS-005', qty: 0.02 }, { itemId: 'INS-007', qty: 0.02 }] },
    { id: 'RECETA-002', name: 'Wantán frito', category: 'Entradas', price: 12, description: 'Wantanes dorados preparados al momento.', active: true, ingredients: [{ itemId: 'INS-006', qty: 6 }, { itemId: 'INS-007', qty: 0.03 }] },
    { id: 'RECETA-003', name: 'Pollo tipakay', category: 'Platos principales', price: 22, description: 'Pollo en salsa dulce con toque cítrico.', active: true, ingredients: [{ itemId: 'INS-002', qty: 0.25 }, { itemId: 'INS-004', qty: 0.06 }, { itemId: 'INS-009', qty: 0.02 }, { itemId: 'INS-010', qty: 0.03 }, { itemId: 'INS-012', qty: 0.02 }] },
    { id: 'RECETA-004', name: 'Sopa wantán', category: 'Sopas', price: 15, description: 'Caldo de pollo, wantanes y fideo chino.', active: true, ingredients: [{ itemId: 'INS-006', qty: 4 }, { itemId: 'INS-002', qty: 0.10 }, { itemId: 'INS-008', qty: 0.05 }, { itemId: 'INS-004', qty: 0.03 }] },
    { id: 'RECETA-005', name: 'Tallarín saltado', category: 'Platos principales', price: 20, description: 'Fideo chino salteado al wok con pollo y sillao.', active: true, ingredients: [{ itemId: 'INS-008', qty: 0.20 }, { itemId: 'INS-002', qty: 0.12 }, { itemId: 'INS-004', qty: 0.05 }, { itemId: 'INS-005', qty: 0.02 }, { itemId: 'INS-007', qty: 0.02 }] },
    { id: 'RECETA-006', name: 'Inka Kola personal', category: 'Bebidas', price: 6, description: 'Bebida personal fría.', active: true, ingredients: [{ itemId: 'INS-011', qty: 1 }] }
  ];

  const kardex = items.map((item, index) => ({
    id: `KDX-INI-${String(index + 1).padStart(3, '0')}`,
    date: isoDaysAgo(15 - index), itemId: item.id, itemName: item.name,
    type: 'APERTURA', quantity: item.stock, before: 0, after: item.stock,
    unitCost: item.unitCost, reference: 'INV-APERTURA-2026',
    reason: 'Saldo inicial de inventario de demostración', user: 'Sistema'
  }));

  const purchaseOrders = [
    {
      id: 'OC-2026-0004', supplierId: 'PRO-001', supplierName: suppliers[0].businessName,
      issueDate: isoDaysAgo(6), status: 'Emitida', currency: 'PEN', taxRate: 0.18,
      items: [{ itemId: 'INS-001', itemName: 'Arroz superior', quantity: 20, unitCost: 4.20 }, { itemId: 'INS-005', itemName: 'Sillao', quantity: 4, unitCost: 9.50 }],
      subtotal: 122.00, tax: 21.96, total: 143.96
    }
  ];

  const sales = [
    { id: 'VTA-2026-0101', date: isoDaysAgo(5, 13), customer: 'Mesa 04', cashier: 'José Ramírez', payment: 'Yape / Plin', items: [{ recipeId: 'RECETA-001', name: 'Arroz chaufa', quantity: 2, unitPrice: 18 }], subtotal: 36, discount: 0, tax: 0, total: 36, stockApplied: false },
    { id: 'VTA-2026-0102', date: isoDaysAgo(4, 14), customer: 'Mesa 02', cashier: 'José Ramírez', payment: 'Efectivo', items: [{ recipeId: 'RECETA-003', name: 'Pollo tipakay', quantity: 2, unitPrice: 22 }], subtotal: 44, discount: 0, tax: 0, total: 44, stockApplied: false },
    { id: 'VTA-2026-0103', date: isoDaysAgo(3, 15), customer: 'Delivery local', cashier: 'José Ramírez', payment: 'Tarjeta', items: [{ recipeId: 'RECETA-005', name: 'Tallarín saltado', quantity: 2, unitPrice: 20 }, { recipeId: 'RECETA-002', name: 'Wantán frito', quantity: 1, unitPrice: 12 }], subtotal: 52, discount: 0, tax: 0, total: 52, stockApplied: false },
    { id: 'VTA-2026-0104', date: isoDaysAgo(2, 19), customer: 'Mesa 07', cashier: 'José Ramírez', payment: 'Yape / Plin', items: [{ recipeId: 'RECETA-004', name: 'Sopa wantán', quantity: 2, unitPrice: 15 }], subtotal: 30, discount: 0, tax: 0, total: 30, stockApplied: false },
    { id: 'VTA-2026-0105', date: isoDaysAgo(1, 20), customer: 'Mesa 01', cashier: 'José Ramírez', payment: 'Efectivo', items: [{ recipeId: 'RECETA-001', name: 'Arroz chaufa', quantity: 1, unitPrice: 18 }, { recipeId: 'RECETA-006', name: 'Inka Kola personal', quantity: 2, unitPrice: 6 }], subtotal: 30, discount: 0, tax: 0, total: 30, stockApplied: false }
  ];

  return {
    version: 1,
    items, suppliers, recipes, kardex, purchaseOrders, sales,
    returns: [
      { id: 'DEV-2026-0001', date: isoDaysAgo(3), itemId: 'INS-004', itemName: 'Cebolla china', lot: 'VEG-2610-C', quantity: 0.5, type: 'MERMA', reason: 'Producto deteriorado en recepción', supplierId: 'PRO-001', supplierName: suppliers[0].businessName, evaluation: { compliance: 90, delivery: 85, quality: 72 }, registeredBy: 'Carlos Mendoza' }
    ],
    incidents: [
      { id: 'INC-2026-001', date: isoDaysAgo(1), category: 'Equipos', title: 'Impresora de caja', detail: 'La impresora térmica presenta atascos intermitentes.', priority: 'Alta', status: 'Pendiente', createdBy: 'María López' }
    ],
    stockReports: [
      { id: 'DES-2026-001', date: isoDaysAgo(0), itemId: 'INS-004', itemName: 'Cebolla china', quantity: 2, priority: 'Alta', status: 'Pendiente', createdBy: 'María López', detail: 'El stock se encuentra por debajo del mínimo.' }
    ],
    requests: [
      { id: 'SOL-2026-001', date: isoDaysAgo(2), type: 'Permiso', requestedDate: isoDaysAgo(-1).slice(0, 10), detail: 'Trámite personal por la mañana.', status: 'Pendiente', createdBy: 'María López' }
    ],
    complaints: [
      { id: 'REC-2026-0001', trackingCode: 'GDR-6F2K9P', date: isoDaysAgo(1), customerName: 'Ana Torres', email: 'ana@example.test', type: 'Atención', detail: 'Demora en la entrega del pedido.', status: 'En revisión', response: '' }
    ],
    auditLog: []
  };
}

function normalizeState(value) {
  const seed = seedState();
  if (!value || typeof value !== 'object') return seed;
  for (const key of Object.keys(seed)) {
    if (!Array.isArray(value[key])) value[key] = seed[key];
  }
  value.version = 1;
  return value;
}

export function loadState() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      const initial = seedState();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    return normalizeState(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (error) {
    console.error('[store] No se pudo leer el estado local. Se inicia con datos semilla:', error.message);
    return seedState();
  }
}

export function persistState(state) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tempFile, DATA_FILE);
}

export function createTransactionalStore(initialState = loadState()) {
  let state = initialState;
  let queue = Promise.resolve();

  return {
    read: () => state,
    snapshot: () => structuredClone(state),
    replace: (next) => { state = next; },
    transaction: (work) => {
      const run = queue.then(async () => {
        const before = structuredClone(state);
        try {
          const result = await work(state);
          persistState(state);
          return result;
        } catch (error) {
          state = before;
          throw error;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    }
  };
}

export const DEMO_USERS = [
  { username: 'admin.guerrero', password: 'Guerrero2026!', name: 'Carlos Mendoza', role: 'Gerente', code: 'GER-001' },
  { username: 'maria.trab', password: 'Trabajo2026!', name: 'María López', role: 'Trabajador', code: 'TRA-014' },
  { username: 'jose.caja', password: 'Caja2026!', name: 'José Ramírez', role: 'Cajero', code: 'CAJ-008' }
];
