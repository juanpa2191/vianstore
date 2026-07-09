---
pr: 10
title: Historial de pedidos (cliente)
phase: 3 - Post-compra
status: merged
depends_on: [8]
branch: pr-10-order-history
---

# PR #10 — Historial de pedidos (cliente)

## Objetivo
El cliente puede ver todos sus pedidos, el estado actual y el número de guía cuando exista.

## Alcance
- [x] `/account/orders` — Server Component con `listMyOrders(userId)`. Lista ordenada por `createdAt DESC` con `shortId`, `<OrderStatusBadge>`, fecha, total y conteo de ítems. Empty state con link al catálogo.
- [x] `/account/orders/[id]` — Server Component con `getMyOrder(userId, id)`:
  - Ítems snapshot (nombre, color, talla, precio unitario, subtotal).
  - Línea de tiempo con 5 pasos + `aria-current="step"`. Ramos especiales para `cancelado` y estado fuera del enum listado.
  - Address del pedido (snapshot validado con Zod dentro del helper). Fallback amber si el JSON está corrupto — no rompe la ruta.
  - Card "Envío en camino" siempre que `status='enviado'`: guía si existe, fallback "guía próximamente" si no. Carrier desconocido → "Transportadora desconocida" (no el slug crudo).
  - Link a la transportadora en nueva pestaña con `rel="noopener noreferrer"`; código `encodeURIComponent(trackingCode)`.
- [x] `<OrderStatusBadge />` reutilizable con 2 tamaños (`sm`/`md`).
- [x] `/checkout/success/[orderId]` refactorizado para consumir `getMyOrder` — unifica el shape público, elimina duplicación y evita leak accidental de campos internos (`userEmail`, `emailSentAt`, `emailError`).
- [x] Migración `Order.trackingCarrier` + `Order.trackingCode` (nullable). Admin CRUD llega en PR #11.
- [x] `/account` landing con 2 cards (Mis pedidos, Dirección) sustituyendo el placeholder.
- [x] `lib/orders/carriers.ts` con 4 transportadoras colombianas (Servientrega, Coordinadora, Envía, Interrapidísimo) + "otro" con `trackingUrl: null`.

## Fuera de scope (diferido con nota)
- Paginación en `listMyOrders`: irrelevante en volumen MVP.
- Verificación periódica de URLs de tracking: responsabilidad del admin (PR #11).
- Filtro/búsqueda en `/account/orders`: cliente promedio tendrá pocos pedidos.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un cliente logueado sólo ve sus propios pedidos.
- El detalle muestra información consistente con la DB.
- El link a la transportadora abre en nueva pestaña.

## Notas técnicas
- Autorización: filtrar por `userId` del server; no confiar en el `id` de URL sin validar dueño.
- Server Components para lectura, sin necesidad de client fetching.

## Code review

### 2026-07-06 — pase 1 → `APPROVE WITH SUGGESTIONS`

Findings: 0 HIGH, 3 MEDIUM, 5 LOW.

Aplicados en el mismo PR:
- **MEDIUM #1** — Timeline se opacaba al 40% ante cualquier `OrderStatus` fuera de `TIMELINE` (drift futuro del enum). Fix: `isUnknownStatus` con mensaje explícito + `console.warn`.
- **MEDIUM #2** — Snapshot corrupto bloqueaba la ruta entera con `notFound()` (cliente perdía acceso a items/tracking legítimos). Fix: `getMyOrder` valida internamente y retorna `address: AddressSnapshot | null`; la ruta degrada con banner "dirección no disponible".
- **MEDIUM #3** — `/checkout/success` y `/account/orders/[id]` leían el pedido con queries divergentes (la de success traía todas las columnas, riesgo de leak de `emailError`). Fix: `/checkout/success` reescrita para usar `getMyOrder`. Ambas rutas comparten el shape con `select` explícito.
- **LOW** — `aria-current="step"` en el timeline, fallback "Transportadora desconocida" en vez del slug crudo, mensaje "guía próximamente" cuando `status='enviado'` sin código, `trackingCode?.trim() || null` para rechazar strings vacíos.

Diferidos: paginación de `listMyOrders`, verificación de URLs de carriers.

### 2026-07-06 — pase 2 → `APPROVE`

0 findings. Verificaciones específicas pasan limpias:
- `getMyOrder` no expone `userEmail`/`emailSentAt`/`emailError`/`userId` al UI.
- La degradación por snapshot corrupto no deja `undefined` en JSX.
- `/checkout/success` mantiene contract (UUID + userId filter + unified `notFound`).
- Timeline con `aria-current="step"` semánticamente correcto.
- `trim() || null` maneja todos los casos (null/""/whitespace/valid).

**Veredicto final: APPROVE.** Habilita E2E.
