---
pr: 10
title: Historial de pedidos (cliente)
phase: 3 - Post-compra
status: pending
depends_on: [8]
branch: pr-10-order-history
---

# PR #10 — Historial de pedidos (cliente)

## Objetivo
El cliente puede ver todos sus pedidos, el estado actual y el número de guía cuando exista.

## Alcance
- [ ] `/account/orders` — lista ordenada por fecha (más nuevo primero) con estado, total y fecha.
- [ ] `/account/orders/[id]` — detalle:
  - Items comprados con talla, color, precio y cantidad.
  - Estado actual con badge y línea de tiempo simple.
  - Dirección de envío (snapshot).
  - Si `status = enviado`: transportadora + número de guía + link a la web de la transportadora.
- [ ] Componente `<OrderStatusBadge />` reutilizable.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un cliente logueado sólo ve sus propios pedidos.
- El detalle muestra información consistente con la DB.
- El link a la transportadora abre en nueva pestaña.

## Notas técnicas
- Autorización: filtrar por `userId` del server; no confiar en el `id` de URL sin validar dueño.
- Server Components para lectura, sin necesidad de client fetching.
