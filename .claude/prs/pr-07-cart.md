---
pr: 7
title: Carrito
phase: 2 - Compra
status: merged
depends_on: [6]
branch: pr-07-cart
---

# PR #7 — Carrito

## Objetivo
Carrito persistente que sobrevive recargas y sesión. Un cliente logueado y uno anónimo deben tener buena experiencia; al hacer login, el carrito anónimo se fusiona con el del usuario.

## Alcance
- [x] Modelos Prisma: `Cart` (id, userId nullable unique, timestamps) + `CartItem` (id, cartId, skuId, qty). `@@unique([cartId, skuId])`.
- [x] Estrategia:
  - Anónimo → cookie firmada HMAC-SHA256 (`vs_cart` en dev, `__Host-vs_cart` en prod) con formato `<uuid>.<base64url(hmac)>`.
  - Logueado → cart `1:1` con `Profile` via `Cart.userId` unique.
  - Al login: `mergeAnonymousCartIntoUser` en `auth/callback` fusiona atómicamente (transacción única). Suma qty por SKU, capa por stock actual, descarta productos no-activos, borra cart anónimo y cookie.
- [x] Server Actions con Zod:
  - `addToCart(skuId, qty)` — upsert atómico + `qty: { increment }`, validación de stock post-upsert dentro de la tx (rollback si excede).
  - `updateQty(itemId, qty)` — usa readOnly (evita crear cart huérfano por request inválido). qty=0 elimina la fila.
  - `removeItem(itemId)` — idempotente ante P2025.
- [x] Validaciones: qty ≤ sku.stock, product.status = 'active', CHECK qty > 0 en DB.
- [x] UI:
  - CTA "Agregar al carrito" habilitado en `/p/[slug]` con `useTransition`.
  - Badge en header (Server Component) con conteo total; `revalidatePath("/", "layout")` propaga.
  - `/cart` con lista editable (+/- optimistic + delete), warning por stock/producto no disponible, resumen y CTA a checkout disabled (PR #8).
  - Sin mini-cart (decisión: badge → /cart directo).
- [x] RLS defensa-en-profundidad: `cart` owner select/update/delete + admin all; `cart_item` owner SELECT only + admin all (writes solo pasan por Prisma).
- [x] Lazy cart creation: `getCartSessionReadOnly` para reads, `getCartSession` (crea si no existe) solo desde `addToCart` y `mergeAnonymousCartIntoUser`.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Recargar la página no pierde el carrito (anónimo ni logueado).
- Login mientras hay carrito anónimo fusiona correctamente.
- Intentar agregar más que el stock muestra error claro.

## Notas técnicas
- Cookie de cart anónimo: firmar con secret para evitar tampering.
- Los precios se muestran desde `Sku.price` en tiempo real; no cachearlos en `CartItem` (se calculan en checkout).

## Code review

### 2026-07-06 — pase 1 → `BLOCK`

Findings: 3 HIGH, 4 MEDIUM, 8 LOW.

Aplicados en el mismo PR:
- **HIGH #1** — `addToCart` con race y sin manejo de P2002. Reescrito con `upsert` sobre `cartId_skuId` (create qty / update `{ qty: { increment } }`). Validación de stock post-upsert dentro de la tx: si excede, throw `StockExceededError` → rollback. `sku.findUnique` movido dentro de la tx.
- **HIGH #2** — `getCartSession` (user path) podía hacer double-create y explotar por UNIQUE. Reemplazado por `prisma.cart.upsert`.
- **HIGH #3** — `updateQty` y `removeItem` llamaban `getCartSession()` (write-mode) → carts huérfanos por request inválido, vector DoS. Migradas a `getCartSessionReadOnly`; retorno idempotente si no hay cart.
- **MEDIUM #1** — Policy `cart_item FOR ALL` permitía INSERT/UPDATE/DELETE con qty > stock desde ANON key. Eliminada; queda solo owner SELECT + admin ALL. Delta aplicada a Supabase.
- **MEDIUM #2** — `mergeAnonymousCartIntoUser` no era atómico. `upsert` del userCart movido dentro del `$transaction`; `cookies().delete` solo tras commit.
- **MEDIUM #3** — Merge con loop N+1 (findUnique + create/update por item). Reemplazado por `upsert` con `qty: { increment }`; cap por stock post-upsert.
- **MEDIUM #4** — `sku.stock` stale en `addToCart`. Movido dentro de la tx (parte del HIGH #1).
- **LOWs** — `__Host-` prefix en producción (via `NODE_ENV`), regex UUID estricta canónica 8-4-4-4-12, `take: 5` en imágenes de `getCartView` para evitar over-fetch.

Diferidos con nota (LOWs no bloqueantes):
- Rotación de `CART_COOKIE_SECRET` (post-MVP).
- `updateQty(qty=0)` sobrecarga semántica con `removeItem` (contrato documentado).
- `revalidatePath("/", "layout")` alcance amplio — trade-off aceptado; migrar a `revalidateTag` cuando el badge sea client-side.
- try/catch cookies() más granular en `getCartSession`.
- `useOptimistic` en CartItems.tsx (UX polish).

### 2026-07-06 — pase 2 → `APPROVE`

Findings: 0 HIGH, 0 MEDIUM, 2 LOW/SUGGESTION cosméticos (orden de declaración de clases de error en `actions.ts`; `sku.stock` fuera de tx en el merge — bajo scope declarado, aceptado).

**Veredicto final: APPROVE.** Habilita E2E.
