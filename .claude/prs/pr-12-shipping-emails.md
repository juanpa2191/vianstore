---
pr: 12
title: Email de despacho + estados adicionales
phase: 3 - Post-compra
status: merged
depends_on: [9, 11]
branch: pr-12-shipping-emails
---

# PR #12 — Email de despacho + estados adicionales

## Objetivo
Notificar al cliente por email cuando su pedido cambia a `enviado` (con la guía) y opcionalmente cuando llega a `entregado`.

## Alcance
- [x] Plantilla `emails/OrderShipped.tsx`: hero + número de guía prominente + botón "Rastrear en {carrier}" (o "Rastrear envío" para carriers no mapeados) + link a `/account/orders/[id]`. `carrierName` como `string | null` para omitir la placa "con Otra transportadora" cuando el slug es `otro` o desconocido.
- [x] Plantilla `emails/OrderDelivered.tsx`: agradecimiento + CTA al catálogo. Sin PII adicional (solo `orderShortId`, `catalogUrl`, `customerName`).
- [x] `lib/email/shared.ts` con `categorizeEmailError`, `firstNameFrom`, `getSiteUrlOrFail`. Deduplicado en los 3 helpers de email.
- [x] `lib/email/order-shipped.ts` — atomic claim sobre `shippedEmailSentAt`, guards de address snapshot / SITE_URL, `idempotencyKey: shipped:<id>` a Resend, try/catch envolvente (cierra el gap del claim inicial fallido). Logs sanitizados con `slice(200)`.
- [x] `lib/email/order-delivered.ts` — mismo patrón, gate `ENABLE_DELIVERY_EMAIL === "1"`.
- [x] Hook en `app/admin/orders/actions.ts` al final de `runTransition`: `after(() => sendOrderShippedEmail(...))` si `to === "enviado"`; `after(() => sendOrderDeliveredEmail(...))` si `to === "entregado"` y el toggle está activo. Fire-and-forget POST-commit con `waitUntil`.
- [x] Toggle `ENABLE_DELIVERY_EMAIL` documentado en `.env.example`.
- [x] Migración: `Order.shippedEmailSentAt`, `Order.shippedEmailError`, `Order.deliveredEmailSentAt`, `Order.deliveredEmailError`.
- [x] Comment en `Order.updatedAt` sobre bump por claims/releases — usar `Order.statusChanges` (PR #11) para "última acción del cliente".

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Cambiar estado a `enviado` desde `/admin/orders/[id]` dispara automáticamente el email.
- El link a la transportadora funciona (probar con al menos una transportadora local).
- Los fallos de email no bloquean la transición de estado.

## Notas técnicas
- Reusar `lib/email.ts` de PR #9.
- Considerar un pequeño mapa `carrier → tracking URL template` (Servientrega, Interrapidísimo, Envía, etc.). Vive en `lib/carriers.ts`.

## Code review

### 2026-07-09 — pase 1 → `APPROVE WITH SUGGESTIONS`

Findings: 0 HIGH, 4 MEDIUM, 6 LOW.

Aplicados:
- **MEDIUM #1** — `missing_tracking` era defensive dead code (Zod ya garantiza). Eliminado; si por edge llega vacío, cae en `unexpected_error`.
- **MEDIUM #2** — Claim `updateMany` inicial fuera del try/catch → silent loss si falla. Fix: `let claimedByUs = false` + try/catch envolvente + best-effort persist de `shipped_email_error = "claim_failed"` con `.catch(() => {})` si el claim inicial explota.
- **MEDIUM #3** — SITE_URL check inline duplicado en `order-confirmation.ts`. Fix: `getSiteUrlOrFail()` en los 3 helpers (single source of truth).
- **MEDIUM #4** — `updatedAt` bumpea con cada claim/release. Fix: comment explícito en el modelo `Order` advirtiendo no usarlo como "última acción del cliente" — para eso, `Order.statusChanges`.
- **LOW** — Logs con raw `err`. Fix: `err.message.slice(0, 200)` en todos los `console.error` de los 2 helpers (matching `lib/email.ts`).
- **LOW** — Subject "con Otra transportadora". Fix: subject genérico cuando `carrier?.slug === "otro"`.
- **LOW** — Section vacía cuando `trackingUrl === null`. Fix: sección condicionada + `marginTop` ajustado.

Diferidos:
- Env toggle strict `=== "1"` — aceptable.
- Tests de integración para `after()` — fuera de scope.

### 2026-07-09 — pase 2 → `APPROVE`

Findings: 0 HIGH, 0 MEDIUM, 2 LOW/SUGGESTION.

Aplicados los 2:
- Preview + body también condicionan `carrierName` (antes solo el subject). `carrierName` ahora es `string | null` en `OrderShippedProps`; template omite la placa "con Otra transportadora" en las 3 superficies.
- Logs con `err` no sanitizados en `order-confirmation.ts` (pre-existentes). Aplicado `err.message.slice(0, 200)` para armonizar.

**Veredicto final: APPROVE.** Habilita E2E.
