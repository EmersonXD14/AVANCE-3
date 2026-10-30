# Casos de prueba recomendados — Sprint 2

| ID | Módulo | Acción | Resultado esperado |
|---|---|---|---|
| INV-01 | Inventario | Registrar entrada válida de 5 kg | Stock incrementa y se crea Kardex con saldo antes/después |
| INV-02 | Inventario | Registrar salida mayor al saldo | Operación rechazada; stock no cambia |
| INV-03 | Inventario | Filtrar stock mínimo | Se listan insumos con stock menor o igual al mínimo |
| PRO-01 | Proveedores | Registrar RUC de 10 dígitos | Validación rechaza el proveedor |
| PRO-02 | Proveedores | Registrar un RUC ya existente | Validación rechaza duplicidad |
| PRO-03 | Proveedores | Registrar RUC de 11 dígitos no repetido | Proveedor se crea |
| OC-01 | Compras | Crear OC de varias líneas | Calcula subtotal, IGV 18% y total |
| OC-02 | Compras | Recibir OC emitida | Cada línea genera una entrada Kardex y actualiza stock |
| OC-03 | Compras | Recibir nuevamente la misma OC | Operación rechazada sin duplicar stock |
| REC-01 | Recetas | Crear receta con insumo duplicado | Validación rechaza receta |
| VEN-01 | Ventas | Vender platos con stock suficiente | Registra venta, descuenta escandallo y crea movimientos |
| VEN-02 | Ventas | Vender con stock insuficiente | Venta no se registra y no hay descuentos parciales |
| DEV-01 | Devoluciones | Registrar merma con lote | Stock disminuye y Kardex registra salida |
| DEV-02 | Evaluación | Ingresar score por dimensiones | Se calcula 30/30/40 según pesos definidos |
| KPI-01 | KPIs | Consultar rango de fechas | Métricas se limitan al periodo seleccionado |

## Usuarios y accesos

- Gerente: puede administrar proveedores, órdenes, recetas, devoluciones, KPIs, reclamos y aprobar solicitudes.
- Trabajador: puede consultar inventario, crear movimientos, incidencias, reportes de desabastecimiento y solicitudes propias.
- Cajero: puede operar ventas, consultar recetas y emitir tickets.

Las restricciones de rol se deben comprobar tanto desde el flujo de interfaz como directamente desde los endpoints con un token de otro perfil.
