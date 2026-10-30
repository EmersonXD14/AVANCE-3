# Chifa El Guerrero Dragón — Gestión Integral

Sistema web local para el proyecto académico de gestión operativa y atención integral. Esta entrega eleva el prototipo original y prioriza los módulos del **Sprint 2**.

## 1. Ejecución

**Requisito:** Node.js 22 o superior. No requiere instalar paquetes npm, configurar SQL, levantar Docker ni conectarse a servicios externos.

### Windows

1. Descomprima el paquete completo en una carpeta local.
2. Ejecute `start.bat` con doble clic.
3. Abra `http://127.0.0.1:4173` en el navegador.
4. Mantenga abierta la ventana de terminal mientras utiliza el sistema.
5. Para apagar el servidor, presione `Ctrl + C`.

### macOS / Linux

```bash
./start.sh
```

También puede ejecutar:

```bash
npm start
```

El servidor escucha en `127.0.0.1:4173` por defecto. Para cambiarlo:

```bash
PORT=4300 npm start
```

En Windows PowerShell:

```powershell
$env:PORT=4300; npm start
```

## 2. Usuarios de demostración

| Perfil | Usuario | Contraseña |
|---|---|---|
| Gerente | `admin.guerrero` | `Guerrero2026!` |
| Trabajador | `maria.trab` | `Trabajo2026!` |
| Cajero | `jose.caja` | `Caja2026!` |

Los accesos son datos de demostración para exposición académica. No deben reutilizarse en un despliegue real.

## 3. Sprint 2 implementado

### Inventario y Kardex

- Catálogo de 12 insumos iniciales con SKU, unidad, lote, ubicación, stock, stock mínimo y costo unitario.
- Registro de entradas y salidas con saldo anterior y posterior.
- Bloqueo de salidas que exceden el stock disponible.
- Recepción de órdenes de compra conectada con movimientos de entrada.
- Descuento consolidado de ingredientes desde la receta al confirmar una venta.
- Operaciones agrupadas bajo una transacción local con serialización de mutaciones y reversión ante error.

### Proveedores y compras

- Validación de RUC de exactamente 11 dígitos y unicidad.
- Validación de teléfono y correo cuando se informan.
- Emisión de órdenes de compra con subtotales, IGV 18% y total.
- Estados de orden: emitida y recibida.
- Recepción idempotente: una orden recibida no puede incrementar el stock una segunda vez.

### Recetas y escandallo

- Catálogo de platos y composición de insumos por unidad vendida.
- Cálculo del costo estimado con costos unitarios vigentes.
- Validación de duplicidad de insumos dentro de una receta.
- Salida automática y consolidada del almacén al registrar ventas.

### Alertas, devoluciones y evaluación de proveedores

- Evaluación de la condición `stock_actual <= stock_minimo` cada vez que se consulta el motor de alertas.
- Clasificación de severidad según la cobertura del stock.
- Registro de merma/devolución por lote.
- Salida automática en Kardex y control para no dejar stock negativo.
- Score de proveedores: calidad 40%, cumplimiento 30%, puntualidad 30%.

### KPIs

- Ingresos, costo referencial, margen bruto estimado, ticket promedio y valorización actual del inventario.
- Evolución de ventas por día y productos más vendidos.
- Filtros de fechas desde/hasta.

## 4. Sprint 1 conservado e integrado

- Autenticación local con perfiles Gerente, Trabajador y Cajero.
- Control RBAC aplicado en la API, no solo ocultamiento visual de enlaces.
- Incidencias operativas y cambios de estado.
- Reportes de desabastecimiento que no alteran por sí solos las existencias.
- Solicitudes de permisos, vacaciones y otros requerimientos con aprobación/rechazo gerencial.
- Canal público de reclamos sin registro de usuario.
- Código de seguimiento independiente y validación de estado por identificador + código.
- Caja con pedidos, cálculo de descuentos y emisión de ticket imprimible / guardable como PDF desde el navegador.

## 5. Arquitectura de esta entrega

```text
CHIFA_GUERRERO_PRO/
├── server/
│   ├── server.mjs       # Capa HTTP / controladores REST / autenticación / RBAC
│   ├── services.mjs     # Reglas de dominio y transacciones de negocio
│   └── store.mjs        # Estado semilla y persistencia JSON local
├── public/
│   ├── index.html
│   ├── css/styles.css   # Sistema visual institucional
│   └── js/
│       ├── api.js       # Cliente REST
│       └── app.js       # Interfaz modular por vistas
├── data/                # state.json se crea al iniciar el servidor
├── docs/
└── tests/
```

### Persistencia sin base de datos

Los catálogos de demostración y los datos iniciales están declarados en `server/store.mjs`. Al primer arranque se crea `data/state.json`. Las operaciones mutables se serializan y el archivo se actualiza mediante escritura temporal + renombrado, evitando escrituras parciales. No se utiliza SQL, H2, MySQL, PostgreSQL ni un servicio remoto.

- Para conservar los cambios, mantenga `data/state.json` junto al proyecto.
- Para volver a los datos semilla, detenga el servidor y elimine `data/state.json`; el siguiente arranque lo generará de nuevo.
- Las sesiones expiran a las ocho horas y se guardan en memoria del servidor.
- El acceso aplica hash de contraseña con scrypt, tokens aleatorios de 256 bits, permisos por endpoint y bloqueo temporal después de cinco intentos de autenticación fallidos.

## 6. Verificación

```bash
npm test
```

Comprobación manual de salud de API:

```bash
curl http://127.0.0.1:4173/api/health
```

## 7. Alcance tecnológico y limitaciones importantes

El archivo RAR recibido contenía páginas HTML, una hoja CSS y un archivo JavaScript de navegador; **no contenía Angular, Spring Boot, Maven, controladores Java ni repositorios**. Para entregar una solución que realmente arranque de forma autónoma y se pueda probar en este entorno, esta versión implementa una API REST con Node.js 22 y módulos nativos, y un frontend modular con JavaScript ES Modules.

Por ello, esta entrega **no se presenta falsamente como Angular + Spring Boot**. La separación de control HTTP, servicios de dominio y persistencia local permite migrar posteriormente el cliente a Angular y los servicios a Spring Boot sin trasladar las reglas del negocio desde la interfaz.

Tampoco debe describirse como despliegue industrial productivo: la persistencia JSON y las sesiones en memoria son apropiadas para demostración local y validación académica, no para concurrencia distribuida, alta disponibilidad o datos reales. Para producción se requerirían como mínimo un proveedor de identidad, gestión segura de secretos, base de datos transaccional, auditoría protegida, copias de seguridad, TLS, pruebas de carga y revisión de seguridad.


### Fotografías locales de la página pública
Las imágenes de la portada y de los cuatro platos están guardadas dentro de `public/assets/` y se cargan mediante rutas relativas (`/assets/...`). No dependen de Unsplash ni de una conexión a Internet para mostrarse. Son imágenes gastronómicas ilustrativas generadas para este prototipo académico; no representan necesariamente los platos reales del establecimiento.
