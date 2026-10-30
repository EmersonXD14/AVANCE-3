import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState } from '../server/store.mjs';
import {
  DomainError, createSupplier, createPurchaseOrder, receivePurchaseOrder,
  createSale, recordMovement, stockAlerts, supplierScore
} from '../server/services.mjs';

const actor = { name: 'Carlos Mendoza', role: 'Gerente' };

test('RUC: acepta 11 dígitos y rechaza formato incorrecto o duplicado', () => {
  const state = seedState();
  assert.throws(() => createSupplier(state, { ruc: '1234567890', businessName: 'X', contact: 'X', address: 'X' }), DomainError);
  assert.throws(() => createSupplier(state, { ruc: '20601234567', businessName: 'Duplicado', contact: 'X', address: 'X' }), /Ya existe/);
  const supplier = createSupplier(state, { ruc: '20999888777', businessName: 'Proveedor de prueba S.A.C.', contact: 'Contacto', address: 'Lima' });
  assert.equal(supplier.ruc, '20999888777');
});

test('Recepción de OC actualiza stock y crea Kardex sin permitir duplicados', () => {
  const state = seedState();
  const before = state.items.find((x) => x.id === 'INS-001').stock;
  const order = createPurchaseOrder(state, { supplierId: 'PRO-001', items: [{ itemId: 'INS-001', quantity: 10, unitCost: 4.3 }] }, actor);
  assert.equal(order.tax, 7.74);
  receivePurchaseOrder(state, order.id, actor);
  assert.equal(state.items.find((x) => x.id === 'INS-001').stock, before + 10);
  assert.equal(state.kardex.at(-1).reference, order.id);
  const stockAfterReceive = state.items.find((x) => x.id === 'INS-001').stock;
  assert.throws(() => receivePurchaseOrder(state, order.id, actor), /ya fue recibida/);
  assert.equal(state.items.find((x) => x.id === 'INS-001').stock, stockAfterReceive);
});

test('Una salida manual no puede producir stock negativo', () => {
  const state = seedState();
  const item = state.items.find((x) => x.id === 'INS-004');
  const before = item.stock;
  assert.throws(() => recordMovement(state, { type: 'SALIDA', itemId: item.id, quantity: before + 1, reason: 'Prueba', reference: 'TEST' }, actor), /Stock insuficiente/);
  assert.equal(item.stock, before);
});

test('La venta descuenta ingredientes de recetas y no se registra si falta stock', () => {
  const state = seedState();
  const rice = state.items.find((x) => x.id === 'INS-001');
  const initialRice = rice.stock;
  const sale = createSale(state, { payment: 'Efectivo', items: [{ recipeId: 'RECETA-001', quantity: 2 }] }, actor);
  assert.equal(sale.total, 36);
  assert.equal(rice.stock, initialRice - 0.5);
  const salesCount = state.sales.length;
  const kardexCount = state.kardex.length;
  assert.throws(() => createSale(state, { payment: 'Efectivo', items: [{ recipeId: 'RECETA-001', quantity: 100 }] }, actor), /No hay stock suficiente/);
  assert.equal(state.sales.length, salesCount);
  assert.equal(state.kardex.length, kardexCount);
});

test('Alertas consideran la igualdad con el stock mínimo y score aplica pesos', () => {
  const state = seedState();
  const onion = state.items.find((x) => x.id === 'INS-004');
  assert.ok(stockAlerts(state).some((x) => x.id === onion.id));
  const supplier = state.suppliers[0];
  assert.equal(supplierScore(supplier), 92);
});

test('La unidad transaccional revierte el estado completo cuando falla una operación', async () => {
  const { createTransactionalStore } = await import('../server/store.mjs');
  const local = createTransactionalStore(seedState());
  const initial = local.read().items.find((x) => x.id === 'INS-001').stock;
  await assert.rejects(local.transaction(async (draft) => {
    draft.items.find((x) => x.id === 'INS-001').stock = 999;
    throw new Error('fallo simulado luego de una mutación');
  }), /fallo simulado/);
  assert.equal(local.read().items.find((x) => x.id === 'INS-001').stock, initial);
});
