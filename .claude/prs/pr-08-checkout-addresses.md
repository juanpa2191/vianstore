---
pr: 8
title: Direcciones y checkout (sin pasarela)
phase: 2 - Compra
status: merged
depends_on: [7]
branch: pr-08-checkout-addresses
---

# PR #8 — Direcciones y checkout (sin pasarela)

## Objetivo
Convertir el carrito en un pedido persistido en DB, con dirección de envío y stock descontado. El pago se marca como pendiente hasta que un admin lo confirme manualmente (no hay pasarela en el MVP).

## Alcance
- [x] Modelos: `Address` (unique userId), `Order` (userId nullable + userEmail para trazabilidad), `OrderItem` con snapshots (precio, code, nombres). Enum `OrderStatus` con 6 estados.
- [x] Rutas: `/account/address` (upsert por userId), `/checkout` (resumen + confirmar), `/checkout/success/[orderId]`.
- [x] Server Action `createOrder`:
  - Transacción única con `FOR UPDATE` sobre `cart_item` y `sku` (ORDER BY id).
  - Re-lee items DENTRO de la tx (cierra double-submit).
  - Snapshot de precio + display fields en OrderItem; snapshot de address con Zod `AddressSnapshotSchema` (validado al escribir y al leer).
  - Guard de precio divergente: cliente pasa `expectedTotalCents`; si difiere → abort.
  - CHECK `stock >= 0` como red final; decremento por SKU.
  - Vacía `cart_item` (deja Cart para reuso).
- [x] `/checkout/success` con `notFound()` unificado (no filtra existencia de pedidos ajenos por canal lateral 403 vs 404).
- [x] RLS: address owner select/update/delete + admin ALL; order/order_item owner SELECT + admin ALL. Sin INSERT policy — writes solo por Prisma server-side.
- [x] Proxy raíz protege `/checkout/**` además de `/admin` y `/account`.
- [x] Costo de envío desde `SHIPPING_COST_CENTS` env (default 0), cacheado a nivel módulo.

## Fuera de scope (diferido con nota)
- Decrementos de stock en loop dentro de la tx: aceptable para carts de 1-3 items del MVP. Migrar a `UPDATE ... FROM VALUES` cuando el volumen justifique.
- `revalidatePath("/", "layout")` alcance amplio: trade-off aceptado; refactorar a `revalidateTag` junto con PR #7 en un PR de polish.
- `requireUser` retorna `email ?? ""` — deuda heredada de PR #3. Si mañana llega un provider phone-only, `Order.userEmail` puede quedar vacío. Documentar en PR #11.

## Code review

### 2026-07-06 — pase 1 → `BLOCK`

Findings: 3 HIGH, 4 MEDIUM, 6 LOW.

Aplicados en el mismo PR:
- **HIGH #1** — Double-submit del mismo user podía crear pedidos duplicados descontando stock 2x. Fix: re-lectura de `cart_item` DENTRO de la tx tras `FOR UPDATE` sobre `cart_item` y `sku` (ORDER BY id). El segundo thread encuentra 0 items y aborta con `EmptyCartError`.
- **HIGH #2** — `addressSnapshot` sin runtime validation. Fix: nuevo `lib/checkout/snapshot.ts` con `AddressSnapshotSchema` (Zod). `.parse()` al escribir en `createOrder`, `.safeParse()` al leer en success → `notFound()` si corrupto.
- **HIGH #3** — `Order.userId` con `RESTRICT` bloqueaba baja de usuarios. Fix: nullable + `ON DELETE SET NULL`. Nueva columna `userEmail String` para trazabilidad tras baja. Delta aplicada a DB.
- **MEDIUM #1** — Precio divergente cliente ↔ server. Fix: `expectedTotalCents` viaja del cliente a `createOrder`; si difiere del server-computed → `PriceChangedError` sin filtrar el precio nuevo.
- **MEDIUM #2** — `forbidden()` vs `notFound()` filtraba existencia de pedidos ajenos. Fix: unificado a `notFound()` en ambos casos.
- **LOWs** — `ORDER BY id` en los `FOR UPDATE` (determinismo de locks), índice `order_item.sku_id`, cache de `getShippingCostCents` a nivel módulo, `country: z.literal("CO")`.

Diferidos con nota (arriba en "Fuera de scope").

### 2026-07-06 — pase 2 → `APPROVE`

Findings: 0 HIGH, 0 MEDIUM, 2 LOW. Aplicado LOW #1 (comment stale en migration.sql sobre política de FK). LOW #2 (fallback email en `requireUser`) documentado como deuda heredada de PR #3.

**Veredicto final: APPROVE.** Habilita E2E.

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
