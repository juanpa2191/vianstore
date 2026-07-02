---
pr: 13
title: Dashboard admin
phase: 4 - Cierre
status: pending
depends_on: [11]
branch: pr-13-admin-dashboard
---

# PR #13 — Dashboard admin

## Objetivo
Vista de entrada del admin (`/admin`) que resume lo urgente en un vistazo.

## Alcance
- [ ] `/admin` con tarjetas:
  - **Ventas de hoy** (total y # de pedidos pagados hoy).
  - **Ventas del mes** (total y # de pedidos pagados en el mes).
  - **Pedidos pendientes** — separados por estado (`pendiente_pago`, `pagado`, `en_preparacion`).
  - **Stock bajo** — top 5 SKUs con `stock <= umbral` (umbral configurable, por defecto 3).
- [ ] Cada tarjeta enlaza a la vista detallada correspondiente (listado filtrado).
- [ ] Actualización simple con `revalidate` cada N segundos (60s bastan para MVP).

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un admin abre `/admin` y en 5 segundos entiende qué debe atender.
- Los números coinciden con los datos reales de la DB.

## Notas técnicas
- Queries agregados con `groupBy` de Prisma o SQL raw si conviene.
- Definir la zona horaria de "hoy" y "este mes" — por defecto usar la del server (`America/Bogota`).
- El umbral de stock bajo va en `env` o en una tabla `Setting` sencilla (evaluar).
