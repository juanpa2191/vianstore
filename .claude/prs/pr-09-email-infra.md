---
pr: 9
title: Emails transaccionales (infra + confirmación)
phase: 2 - Compra
status: pending
depends_on: [8]
branch: pr-09-email-infra
---

# PR #9 — Emails transaccionales (infra + confirmación)

## Objetivo
Dejar la infraestructura de email lista y disparar el primer correo transaccional (confirmación de pedido). PRs siguientes reutilizan la misma infra.

## Alcance
- [ ] Cuenta de Resend + verificación de dominio.
- [ ] Setup React Email (`@react-email/components`).
- [ ] Cliente `lib/email.ts` con función `sendEmail({ to, subject, react })`.
- [ ] Plantilla `emails/OrderConfirmation.tsx`:
  - Cabecera VianStore + saludo con nombre del cliente.
  - Resumen del pedido (items, tallas, colores, subtotal, envío, total).
  - Instrucciones de pago manual (transferencia/contra entrega — copy definitivo).
  - Link a `/account/orders/[id]`.
- [ ] Dispararlo desde `createOrder` (PR #8) al final de la transacción, sin bloquear la respuesta si falla el envío (log del error).
- [ ] Modo dev: enviar a una dirección de prueba fija o usar Resend sandbox.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Confirmar un pedido dispara el email a la dirección real del cliente.
- El email renderiza bien en Gmail y Outlook.
- Un fallo del proveedor de email **no** revierte el pedido.

## Notas técnicas
- Ejecutar el envío después del `commit` de la transacción, no dentro.
- Registrar `email_sent_at` y `email_error` en la tabla `Order` (o tabla `EmailLog` — evaluar en implementación).
- Configurar SPF, DKIM y DMARC en el dominio para reputación.
