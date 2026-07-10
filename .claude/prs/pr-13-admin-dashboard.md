---
pr: 13
title: Dashboard admin
phase: 4 - Cierre
status: in_review
depends_on: [11]
branch: pr-13-admin-dashboard
---

# PR #13 — Dashboard admin

## Objetivo
Vista de entrada del admin (`/admin`) que resume lo urgente en un vistazo.

## Alcance
- [x] `/admin` con dashboard:
  - **KPI row (4 stat tiles)**: Ventas de hoy, Ventas del mes, Pedidos pendientes, SKUs con stock bajo.
  - **Card "Pedidos por estado"**: los 3 buckets (`pendiente_pago`, `pagado`, `en_preparacion`) con contador clickable → `/admin/orders?status=<X>`.
  - **Card "Stock bajo (top 5)"**: SKUs ordenados por stock ASC con `stock ≤ LOW_STOCK_THRESHOLD` (default 3). Cada fila linkea directo a `/admin/products/[id]` del producto padre.
- [x] Umbral configurable via env `LOW_STOCK_THRESHOLD`.
- [x] Definición de "venta" alineada al negocio: transición a `pagado` en el rango vía `OrderStatusChange` (no `Order.createdAt`). Filtra `Order.status != 'cancelado'`.
- [x] Zona horaria: `TZ=America/Bogota` resuelta en Postgres con `date_trunc AT TIME ZONE $tz` (no reimplementa DST en JS).
- [x] Sub-nav admin: "Dashboard" agregado como primer link con `exact` match para no marcarse activo en `/admin/products` ni `/admin/orders`.

## Fuera de scope (diferido)
- `revalidate = 60`: `/admin/**` es dinámica por `requireAdmin()` (cookies) — Next 16 ignora el `revalidate`. La copy dice "recarga para ver el último dato".
- Charts / trends: el scope no los pide y la skill `dataviz` recomienda stat tiles para "handful of headline numbers".
- Índice `INCLUDE (order_id)` sobre el parcial: micro-optimización cuando haya evidencia.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un admin abre `/admin` y en 5 segundos entiende qué debe atender.
- Los números coinciden con los datos reales de la DB.

## Notas técnicas
- Queries agregados con `groupBy` de Prisma o SQL raw si conviene.
- Definir la zona horaria de "hoy" y "este mes" — por defecto usar la del server (`America/Bogota`).
- El umbral de stock bajo va en `env` o en una tabla `Setting` sencilla (evaluar).

## Code review

### 2026-07-09 — pase 1 → `APPROVE WITH SUGGESTIONS`

Findings: 2 HIGH, 4 MEDIUM, 8 LOW.

Aplicados en el mismo PR:
- **HIGH #1** — `salesInRange` SUM se doblaba si hubiera múltiples transiciones `pagado` sobre el mismo `Order` (state machine actual lo previene, pero query no se defendía). Fix: CTE `paid_orders` con `SELECT DISTINCT o.id, o.total_cents`; SUM y COUNT consistentes bajo cualquier evolución futura.
- **HIGH #2** — Índice compuesto existente `(order_id, changed_at DESC)` no aplicaba al filtro por rango. Nueva migración con índice parcial `(changed_at) WHERE to_status='pagado'`. Match perfecto, evita seq scan.
- **MEDIUM #1** — `revalidate = 60` era ignorado (ruta dinámica por `cookies()`) y la copy mentía. Fix: constante removida + copy renombrada.
- **MEDIUM #2 + #3** — Drill-down stock bajo iba a lista sin filtro; el linkeo a `/admin/products?q=slug` podía matchear productos con slug prefijo. Fix: `LowStockRow.productId` agregado; link directo a `/admin/products/${productId}`.
- **MEDIUM #4** — `Number(bigint)` sin guard. Fix: centinela `console.error` si `total_cents > MAX_SAFE_INTEGER`.
- **LOW** — Narrow type `PendingStatus`, hint del tile pendientes incluye los 3 buckets, `requireAdmin()` explícito en la page (defensa en profundidad).

Diferidos: `relationLoadStrategy: "join"` (no expuesto en Prisma 7.8), validación estricta de TZ (env controlado), `cache()` sin efecto útil (consistencia con el patrón del código base).

### 2026-07-09 — pase 2 → `APPROVE`

Findings: 0 HIGH, 0 MEDIUM, 4 LOW (todos cosméticos y diferibles):
- Fallback `?? { 0n, 0n }` redundante (agregados sin GROUP BY siempre devuelven 1 fila).
- Índice con `INCLUDE (order_id)` para index-only scan — micro-optimización.
- `requireAdmin()` corre 2× por request (layout + page) — aceptable defensa en profundidad; memoizar con `cache()` en el futuro.
- `PendingStatus` union declarado inline en la page — exportar desde `queries.ts` cuando surja segundo consumer.

**Veredicto final: APPROVE.** Habilita E2E.
