---
pr: 8
title: Direcciones y checkout (sin pasarela)
phase: 2 - Compra
status: pending
depends_on: [7]
branch: pr-08-checkout-addresses
---

# PR #8 — Direcciones y checkout (sin pasarela)

## Objetivo
Convertir el carrito en un pedido persistido en DB, con dirección de envío y stock descontado. El pago se marca como pendiente hasta que un admin lo confirme manualmente (no hay pasarela en el MVP).

## Alcance
- [ ] Modelos Prisma:
  - `Address` — id, userId, fullName, phone, line1, line2, city, state, postalCode, country, isDefault.
  - `Order` — id, userId, addressSnapshot (JSON), status (enum), subtotal, shippingCost, total, createdAt, updatedAt.
  - `OrderItem` — id, orderId, skuId, qty, unitPrice (snapshot), subtotal.
  - Enum `OrderStatus`: `pendiente_pago`, `pagado`, `en_preparacion`, `enviado`, `entregado`, `cancelado`.
- [ ] Rutas:
  - `/account/address` — CRUD de dirección (una sola, según scope MVP).
  - `/checkout` — resumen + selección de dirección + botón "Confirmar pedido".
- [ ] Server Action `createOrder`:
  - Envuelve todo en transacción Prisma.
  - Revalida stock por SKU antes de decrementar (evitar overselling).
  - Snapshotea precios y dirección en el pedido.
  - Deja `status = pendiente_pago`.
  - Vacía el carrito.
- [ ] Página de confirmación `/checkout/success/[orderId]` con resumen y próximos pasos (instrucciones de pago manual: transferencia / contra entrega — dejar como TODO copy).

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un cliente con carrito y dirección puede confirmar un pedido.
- El stock disponible baja exactamente por lo pedido.
- Si dos clientes intentan comprar la última unidad en paralelo, sólo uno gana (la transacción falla para el otro con mensaje claro).
- El pedido aparece en la DB con snapshots correctos.

## Notas técnicas
- El costo de envío se puede dejar fijo o cero en el MVP; parametrizar en `env` para ajustar sin código.
- `addressSnapshot` como JSON garantiza que aunque el usuario edite su dirección después, el pedido histórico no cambia.
- Manejar errores de stock con mensaje que diga qué SKU falla y stock disponible.
