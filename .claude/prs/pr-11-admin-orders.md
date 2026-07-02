---
pr: 11
title: "Admin: gestión de pedidos"
phase: 3 - Post-compra
status: pending
depends_on: [8]
branch: pr-11-admin-orders
---

# PR #11 — Admin: gestión de pedidos

## Objetivo
El admin puede ver todos los pedidos, filtrarlos y moverlos por el ciclo de vida completo (incluyendo registrar la guía de envío).

## Alcance
- [ ] `/admin/orders` — listado con:
  - Filtro por estado (`pendiente_pago`, `pagado`, `en_preparacion`, `enviado`, `entregado`, `cancelado`).
  - Búsqueda por número de pedido, email de cliente o nombre.
  - Orden por fecha desc.
- [ ] `/admin/orders/[id]` — detalle admin:
  - Info del cliente y dirección.
  - Items con SKU, talla, color, cantidad y precio.
  - Panel de transición de estado con guardas:
    - `pendiente_pago → pagado` (confirmación manual del pago).
    - `pagado → en_preparacion`.
    - `en_preparacion → enviado` — pide transportadora y número de guía.
    - `enviado → entregado`.
    - Desde cualquier estado antes de `enviado`: `→ cancelado` (repone stock).
  - Historial de cambios de estado con timestamp y usuario admin.
- [ ] Modelos Prisma nuevos:
  - `OrderShipment` — orderId, carrier, trackingNumber, shippedAt.
  - `OrderStatusChange` — orderId, fromStatus, toStatus, changedByUserId, changedAt.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un admin puede mover un pedido por todos los estados sin errores.
- Cancelar un pedido en `pendiente_pago` o `pagado` devuelve el stock.
- El cliente ve el nuevo estado y la guía en su historial (PR #10).

## Notas técnicas
- Todas las transiciones envueltas en transacción (cambio de estado + inserción en historial + efectos como reposición de stock).
- La reposición de stock debe ser idempotente: si un pedido se cancela dos veces por error, el stock no se dobla.
- Emails de cambio de estado se conectan en PR #12.
