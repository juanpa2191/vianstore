---
pr: 7
title: Carrito
phase: 2 - Compra
status: pending
depends_on: [6]
branch: pr-07-cart
---

# PR #7 — Carrito

## Objetivo
Carrito persistente que sobrevive recargas y sesión. Un cliente logueado y uno anónimo deben tener buena experiencia; al hacer login, el carrito anónimo se fusiona con el del usuario.

## Alcance
- [ ] Modelos Prisma:
  - `Cart` — id, userId (nullable), createdAt, updatedAt.
  - `CartItem` — id, cartId, skuId, qty. Único por (cartId, skuId).
- [ ] Estrategia:
  - Anónimo → cookie con `cartId` (o token firmado).
  - Logueado → cart asociado a `userId`.
  - Al login: si hay cookie de cart anónimo, fusionar sus items con el cart del usuario (suma qty por SKU, respetando stock disponible).
- [ ] Server Actions:
  - `addToCart(skuId, qty)`.
  - `updateQty(itemId, qty)`.
  - `removeItem(itemId)`.
- [ ] Validaciones:
  - No permitir qty > stock disponible.
  - No permitir SKUs de productos inactivos.
- [ ] UI:
  - Botón "Agregar al carrito" habilitado en `/products/[slug]`.
  - Badge en header con conteo total.
  - Página `/cart` con lista editable y subtotal.
  - Drawer/mini-cart opcional (evaluar en implementación).

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Recargar la página no pierde el carrito (anónimo ni logueado).
- Login mientras hay carrito anónimo fusiona correctamente.
- Intentar agregar más que el stock muestra error claro.

## Notas técnicas
- Cookie de cart anónimo: firmar con secret para evitar tampering.
- Los precios se muestran desde `Sku.price` en tiempo real; no cachearlos en `CartItem` (se calculan en checkout).
