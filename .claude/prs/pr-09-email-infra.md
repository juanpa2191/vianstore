---
pr: 9
title: Emails transaccionales (infra + confirmación)
phase: 2 - Compra
status: in_review
depends_on: [8]
branch: pr-09-email-infra
---

# PR #9 — Emails transaccionales (infra + confirmación)

## Objetivo
Dejar la infraestructura de email lista y disparar el primer correo transaccional (confirmación de pedido). PRs siguientes reutilizan la misma infra.

## Alcance
- [x] Setup Resend (`resend`) + React Email (`@react-email/components`). Verificación de dominio → tarea del operador antes del deploy.
- [x] Cliente `lib/email.ts` con `sendEmail({ to, subject, react, idempotencyKey })`:
  - **Dev mode**: sin `RESEND_API_KEY` → log a consola con `maskEmail(finalTo)`; retorna `ok:true, skipped:"no_api_key"`.
  - **Prod mode**: sin `RESEND_API_KEY` → `ok:false, error:"email_provider_not_configured"` (falla ruidoso, no marca enviado).
  - `EMAIL_DEV_REDIRECT_TO`: redirige todos los correos con `[dev:<original>]` en el subject.
  - `sanitizeSubject()`: colapsa CR/LF/tab, cap 200 chars.
- [x] Plantilla `emails/OrderConfirmation.tsx` compatible Gmail+Outlook (tablas + estilos inline, sin flex/grid/webfonts). Incluye saludo, address snapshot, ítems con snapshot, totales, CTA "Ver mi pedido" → `/checkout/success/[orderId]`. `PreviewProps` sólo en dev.
- [x] `lib/email/order-confirmation.ts` con `sendOrderConfirmationEmail(orderId)`:
  - **Atomic claim**: `updateMany({ where: { emailSentAt: null }, data: { emailSentAt: now } })` PRIMERO — evita doble-envío por race con retries futuros.
  - Try/catch envuelto: cualquier excepción libera el claim (`emailSentAt=null` + `emailError`).
  - `AddressSnapshotSchema.safeParse` del JSON persistido; si corrupto → `releaseClaim("address_snapshot_corrupt")`.
  - Guard `SITE_URL` en prod (rechaza si cae a localhost).
  - `idempotencyKey: order.id` a Resend como segunda línea de defensa (24h dedup).
  - `categorizeError(raw)` normaliza a slugs (`resend:invalid_from`, `resend:validation_error`, `resend:rate_limited`, `network:timeout`, `env:not_configured`, `provider_error`) — NUNCA se persiste el mensaje crudo.
- [x] Dispararlo desde `createOrder` con `after()` de `next/server` (Next 16 `waitUntil` garantiza que la promise complete tras el redirect en Vercel serverless).
- [x] Columnas `Order.emailSentAt` (Timestamptz) + `Order.emailError` (Text) para tracking.

## Notas de deploy
- SPF, DKIM y DMARC del dominio → configurar en Resend antes de mandar el primer correo real.
- `EMAIL_FROM` debe pertenecer al dominio verificado.
- `NEXT_PUBLIC_SITE_URL` obligatorio en producción (el email guard aborta si el link cae a localhost).

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Confirmar un pedido dispara el email a la dirección real del cliente.
- El email renderiza bien en Gmail y Outlook.
- Un fallo del proveedor de email **no** revierte el pedido.

## Notas técnicas
- Ejecutar el envío después del `commit` de la transacción, no dentro.
- Registrar `email_sent_at` y `email_error` en la tabla `Order` (o tabla `EmailLog` — evaluar en implementación).
- Configurar SPF, DKIM y DMARC en el dominio para reputación.

## Code review

### 2026-07-06 — pase 1 → `BLOCK`

Findings: 3 HIGH, 4 MEDIUM, 5 LOW.

Aplicados en el mismo PR:
- **HIGH #1** — `void promise.catch()` podía ser matado por Vercel serverless mid-flight. Fix: `after(() => promise.catch(log))` de `next/server` (usa `waitUntil` internamente).
- **HIGH #2** — Idempotency TOCTOU. Fix: atomic claim con `updateMany({ where: { emailSentAt: null } })` PRIMERO. Si falla el envío, `releaseClaim` limpia; si el CAS se pierde, `idempotencyKey` a Resend deduplica.
- **HIGH #3** — Dev fallback marcaba `emailSentAt` en prod si faltaba API key. Fix: en `NODE_ENV=production` sin API key → `ok:false, error:"email_provider_not_configured"` → `categorizeError` → `releaseClaim`.
- **MEDIUM** — PII masking (`maskEmail`), `categorizeError` (slugs, no mensajes crudos), guard de `SITE_URL` en prod, comment de runtime Node en Server Action (no se puede exportar `runtime` desde `"use server"`).
- **LOWs** — `PreviewProps` bajo `NODE_ENV` guard, `sanitizeSubject`, `customerName` consolidado en caller.

### 2026-07-06 — pase 2 → `APPROVE WITH SUGGESTIONS`

Findings: 0 HIGH, 1 MEDIUM, 4 LOW.

Aplicado el MEDIUM (crítico): try/catch post-claim en `sendOrderConfirmationEmail`. Si algo lanza inesperadamente entre el claim y el sendEmail (blip DB, throw en render), el pedido no queda marcado como enviado sin haberlo sido — la excepción libera el claim con `unexpected_error` y re-lanza. Sub-función `sendClaimedOrder(orderId)` extraída para el bloque protegido.

También aplicados: mover `render()` after el check de client (dev sin API key no renderiza, ahorra 100-200ms por checkout) y `categorizeError` con `validation_error` (código real de Resend) en vez de `invalid_to`.

LOWs diferidos: `error.name ?? error.message` (fallback nunca aplica pero inocuo), doble `render()` HTML+text (MVP volumen bajo), `releaseClaim` swallow error (aceptable sin retry cron).

**Veredicto final: APPROVE.** Habilita E2E.
