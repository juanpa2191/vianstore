---
pr: 12
title: Email de despacho + estados adicionales
phase: 3 - Post-compra
status: pending
depends_on: [9, 11]
branch: pr-12-shipping-emails
---

# PR #12 — Email de despacho + estados adicionales

## Objetivo
Notificar al cliente por email cuando su pedido cambia a `enviado` (con la guía) y opcionalmente cuando llega a `entregado`.

## Alcance
- [ ] Plantilla `emails/OrderShipped.tsx`:
  - Confirmación de despacho.
  - Transportadora + número de guía + link a la web de la transportadora.
  - Link a `/account/orders/[id]`.
- [ ] Plantilla opcional `emails/OrderDelivered.tsx` (agradecimiento + invitación a comprar de nuevo).
- [ ] Hook en la transición de estado (PR #11):
  - `en_preparacion → enviado` dispara `OrderShipped`.
  - `enviado → entregado` dispara `OrderDelivered` si está activado por config.
- [ ] Toggle en env para desactivar emails de "entregado" si no lo queremos aún.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Cambiar estado a `enviado` desde `/admin/orders/[id]` dispara automáticamente el email.
- El link a la transportadora funciona (probar con al menos una transportadora local).
- Los fallos de email no bloquean la transición de estado.

## Notas técnicas
- Reusar `lib/email.ts` de PR #9.
- Considerar un pequeño mapa `carrier → tracking URL template` (Servientrega, Interrapidísimo, Envía, etc.). Vive en `lib/carriers.ts`.
