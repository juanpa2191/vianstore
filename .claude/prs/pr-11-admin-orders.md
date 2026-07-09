---
pr: 11
title: "Admin: gestión de pedidos"
phase: 3 - Post-compra
status: in_review
depends_on: [8]
branch: pr-11-admin-orders
---

# PR #11 — Admin: gestión de pedidos

## Objetivo
El admin puede ver todos los pedidos, filtrarlos y moverlos por el ciclo de vida completo (incluyendo registrar la guía de envío).

## Alcance
- [x] `/admin/orders` — listado (Server Component) con:
  - Filtro por estado (`all` + los 6 valores del enum).
  - Búsqueda por email (ILIKE) o número de pedido (UUID completo O shortId hex ≤8 chars vía `$queryRaw`).
  - Orden por `createdAt DESC`, paginación por offset.
- [x] `/admin/orders/[id]` — detalle admin con:
  - Info del cliente (email + user id snapshot).
  - Address snapshot (validado con Zod; fallback amber si corrupto).
  - Ítems (nombre/color/talla/SKU/precio unitario/subtotal — todo snapshot).
  - Panel de transición con `<TransitionsPanel>` client: botones dinámicos según `allowedTransitions(order.status)`. `markShipped` abre form inline (carrier select + código con regex `/^[A-Za-z0-9._\-/#+ ]+$/`). `cancelOrder` usa `prompt()` para capturar razón, cap 500 chars.
  - Card "Envío" (transportadora + guía + shippedAt/deliveredAt + link externo con `encodeURIComponent`) cuando `status ∈ {enviado, entregado}`.
  - Card "Email de confirmación" con timestamp OK, o `emailError` truncado a 120 chars + tooltip completo.
  - `<StatusHistory>` con transiciones `fromStatus → toStatus`, timestamp, `changedByEmail`, `note`.
- [x] Modelos: `Order.shippedAt`, `Order.deliveredAt`, `Order.stockRestoredAt`. Nueva tabla `OrderStatusChange` (append-only con RLS `admin select` + `admin insert` sin UPDATE/DELETE).
- [x] Sub-nav admin: link "Pedidos" habilitado.
- [x] State machine centralizada (`lib/orders/transitions.ts`) como source of truth.

## Fuera de scope (diferido)
- Índice trigram en `userEmail` para búsquedas — deuda para PR de perf cuando haya volumen.
- Búsqueda por customer name dentro del JSON del snapshot — filtro JSON de Prisma es finicky y volumen no lo justifica.
- Modal accesible para `prompt()`/`confirm()` — UX admin polish.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un admin puede mover un pedido por todos los estados sin errores.
- Cancelar un pedido en `pendiente_pago` o `pagado` devuelve el stock.
- El cliente ve el nuevo estado y la guía en su historial (PR #10).

## Notas técnicas
- Todas las transiciones envueltas en transacción (cambio de estado + inserción en historial + efectos como reposición de stock).
- La reposición de stock debe ser idempotente: si un pedido se cancela dos veces por error, el stock no se dobla.
- Emails de cambio de estado se conectan en PR #12.

## Code review

### 2026-07-09 — pase 1 → `BLOCK`

Findings: 8 HIGH, 8 MEDIUM, 4 LOW.

Aplicados en el mismo PR:
- **HIGH #1 + #8** — Error engañoso "cancelado → X" + cast falso al type system. Fix: `OrderNotFoundError` como clase separada + null-check limpio.
- **HIGH #2** — `toResult` re-lanzaba errores desconocidos (framework error en cliente). Fix: `console.error` server-side + `formError` genérico controlado.
- **HIGH #3** — `changedByEmail = ""` posible por edge de auth phone-only. Fix: `requireAdmin` con `forbidden()` si `!user.email` + CHECK `char_length > 0` en DB.
- **HIGH #4** — Idempotencia del cancel apoyada solo en state-machine terminality. Fix: nueva columna `Order.stockRestoredAt` como marca canónica. Inmune a evoluciones futuras del enum.
- **HIGH #5** — `note` compartido corrompiendo historial. Fix: `note: ""` explícito en 3 acciones no-ship + `prompt()` local para cancel con su propia razón + reset de `carrier/code/note` post-envío.
- **HIGH #6** — Búsqueda no matchea shortId. Fix: nueva rama con `$queryRaw` tagged template `SELECT id FROM order WHERE id::text ILIKE ${q}% LIMIT 200`. Prisma parametriza → sin SQL injection.
- **HIGH #7** — Doble validación en `cancelOrder`. Fix: eliminada.
- **MEDIUM #1** — Policy admin `FOR ALL` permitía UPDATE/DELETE del historial. Fix: split en `admin select` + `admin insert` sin UPDATE/DELETE → append-only a nivel DB.
- **MEDIUM #2** — `emailError` sin truncar. Fix: 120 chars + tooltip completo.
- **MEDIUM #4** — Regex `trackingCode` restrictivo rechazaba guías reales. Fix: ampliado a `/^[A-Za-z0-9._\-/#+ ]+$/`.
- **MEDIUM #6** — Sombra de nombre `Search`. Fix: renombrado a `SearchParams`.
- **MEDIUM #7** — `onShip` no reseteaba carrier/code. Fix: reset completo post-éxito.

Diferidos (arriba en "Fuera de scope").

### 2026-07-09 — pase 2 → `APPROVE`

Findings: 0 HIGH, 0 MEDIUM, 4 LOW. Aplicados los 4:
- Placeholder del listado alineado con implementación real ("email o #número", sin "nombre").
- Docstring de `listAdminOrders` actualizado (menciona shortId + email + UUID, no snapshot JSON).
- Docstring de `runTransition` actualizado (idempotencia por `stockRestoredAt`, no state-machine terminality).
- `prompt()` de cancel trunca a 500 chars en cliente antes de enviar.

**Veredicto final: APPROVE.** Habilita E2E.
