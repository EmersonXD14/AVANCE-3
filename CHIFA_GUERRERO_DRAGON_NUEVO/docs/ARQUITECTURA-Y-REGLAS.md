# Arquitectura, reglas e invariantes del dominio

## Módulos

1. **Inventario:** catálogo de insumos, unidades, lotes, ubicaciones, costo y stock mínimo.
2. **Kardex:** libro cronológico de movimientos; cada movimiento conserva cantidad, saldo anterior, saldo posterior, referencia, motivo y usuario.
3. **Proveedores:** RUC único con formato de 11 dígitos y datos de contacto validados.
4. **Compras:** documento de compra con subtotal, IGV del 18% y total; una recepción genera una entrada por cada línea.
5. **Recetas:** relaciones de insumos y gramajes por plato; el costo estimado se deriva del costo unitario actual de los insumos.
6. **Ventas:** pedido consolidado; primero se valida el stock completo, luego se descuenta cada insumo y se registra la venta dentro de la misma transacción.
7. **Mermas/devoluciones:** identificación de lote, motivo, proveedor relacionado y evaluación ponderada.
8. **Alertas:** condición `stock <= minStock`.
9. **KPIs:** métricas agregadas por fechas de venta.

## Invariantes

- Ninguna salida puede dejar el stock en negativo.
- Una orden solo puede pasar de `Emitida` a `Recibida` una vez.
- La recepción de compra actualiza el stock y escribe Kardex en una sola transacción.
- La venta solo se guarda cuando todos los insumos de todas las recetas tienen disponibilidad suficiente.
- La venta descuenta una sola salida consolidada por insumo, incluso si ese insumo aparece en más de un plato del pedido.
- No se permite registrar dos proveedores con el mismo RUC.
- Una receta no puede repetir el mismo insumo en dos líneas.
- La generación de reclamos es pública, pero su consulta exige identificador y código de seguimiento.
- Los permisos se comprueban en los endpoints, independientemente de la visibilidad de la interfaz.

## Fórmulas

- `subtotal_OC = Σ(cantidad × costo_unitario)`
- `IGV = redondear(subtotal_OC × 0.18, 2)`
- `total_OC = subtotal_OC + IGV`
- `costo_receta = Σ(gramaje_insumo × costo_unitario_insumo)`
- `score_proveedor = 0.30 × cumplimiento + 0.30 × puntualidad + 0.40 × calidad`
- `alerta = stock_actual <= stock_minimo`

## Transacción local

`createTransactionalStore()` encola mutaciones para que se ejecuten de forma serial. Antes de ejecutar, clona el estado completo; si la regla de dominio falla, restaura la copia y no persiste cambios. Si termina correctamente, escribe un archivo temporal y lo renombra sobre el estado local.

Esta estrategia cubre la atomicidad del flujo dentro de un único proceso Node. No es un sustituto de las garantías de una base de datos transaccional concurrente distribuida.
