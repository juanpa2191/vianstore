---
pr: 4
title: Modelo de catálogo
phase: 1 - Catálogo
status: merged
depends_on: [2]
branch: pr-04-catalog-model
---

# PR #4 — Modelo de catálogo

## Objetivo
Modelo de datos completo de catálogo: producto con variantes talla × color, cada variante con SKU único, stock y precio propios. Este es el corazón del negocio.

## Alcance
- [x] Modelos Prisma:
  - `Brand` — id, name, slug.
  - `Color` — id, name, hex.
  - `Size` — id, label (ej "38", "39"), sortOrder.
  - `Product` — id, slug, name, description, brandId, status (enum), createdAt.
  - `Variant` — id, productId, colorId, sizeId. Único por (productId, colorId, sizeId).
  - `Sku` — id, variantId (único), code (SKU imprimible), price (centavos), stock, createdAt.
  - `ProductImage` — id, productId, url, sortOrder, colorId (opcional, para mostrar imagen por color).
- [x] Enum de estado del producto (`draft`, `active`, `archived`).
- [x] Índices:
  - `Product.slug` único, `Product.brandId`, `Product.status`.
  - Índice compuesto en `Sku(price, stock)` para filtros.
  - Full-text search en `Product.name` — GIN `to_tsvector('spanish', name)` listo para PR #6.
- [x] Migración `20260703200000_catalog` aplicada a Supabase.
- [x] Seeds idempotentes con:
  - 3 marcas (Nike, Adidas, Puma).
  - 6 colores base, 8 tallas (35–42).
  - 6 productos con variantes (144 SKUs) y stock realista sesgado a 38–40.
- [x] RLS habilitada en las 7 tablas de catálogo (defensa en profundidad para el ANON key del PR #6).
- [x] CHECK constraints: `sku.stock >= 0`, `sku.price >= 0`, `color.hex ~ '^[0-9a-fA-F]{6}$'`.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- `pnpm prisma migrate dev` corre limpio.
- Seeds ejecutan sin duplicados en re-ejecuciones.
- Query de prueba retorna un producto con sus variantes, imágenes y stock por SKU.

## Notas técnicas
- Precio en **centavos** (int) para evitar problemas de precisión decimal.
- SKU code puede seguir el patrón `<brand>-<product>-<color>-<size>` o dejarse auto-generado. Decidir en implementación.
- La relación `Variant → Sku` es 1:1 en el MVP; se modela como tabla separada por si mañana necesitamos precios por canal o costo.

## Code review

### 2026-07-05 — pase 1 → `APPROVE WITH SUGGESTIONS`

Findings del agente `code-reviewer`: 2 HIGH, 4 MEDIUM, 6 LOW.

Aplicados en el mismo PR:
- **HIGH #1** — RLS ausente en las 7 tablas de catálogo. Agregado al suplemento del `migration.sql`: `ENABLE ROW LEVEL SECURITY` + policies `public read` (reference data + product `active` + variant/sku/product_image via `EXISTS` sobre product activo) + `admin all` (via `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`). Delta aplicada a Supabase con script one-shot ya eliminado.
- **HIGH #2** — `Color.name` sin `@unique`. Agregado en `schema.prisma`; seed reescrito con `upsert` directo por name en lugar del patrón racy `findFirst + create`.
- **MEDIUM #1** — `Brand.name` sin `@unique`. Agregado.
- **MEDIUM #2** — `ProductImage` sin unique compuesto y sin índice `colorId`. Agregado `@@unique([productId, url])` + `@@index([productId, colorId])`. Seed usa upsert por `productId_url`.
- **MEDIUM #3** — `seedProducts` sin `$transaction`. Envuelto por producto con `timeout: 30_000` (default 5s se agotaba con 24 upserts secuenciales por producto en el pooler).
- **MEDIUM #4** — Contadores del seed sobrecuentan en re-runs. Reescritos con detección real de fila nueva.
- **LOW** — CHECK `sku.price >= 0`, CHECK `color.hex ~ '^[0-9a-fA-F]{6}$'`, SKU code sin overwrite en re-runs, `brandCode` movido a la constante `BRANDS`.

Diferidos con nota:
- `sortOrder` con gaps: catálogo del MVP es pequeño.
- Timestamps consistentes en tablas de referencia: no bloquea; sumar en un PR de tooling.
- Índice parcial `sku(price) WHERE stock > 0`: se decide en PR #6 cuando llegue el filtro real.

### 2026-07-05 — pase 2 → `APPROVE`

Findings: 0 HIGH, 0 MEDIUM, 1 LOW cosmético (detección `imageIsNew` por ventana temporal en `seed.ts` → falso positivo si dos corridas caen <5s, o clock skew DB↔Node). Corregido en el mismo pase con el patrón `before findUnique + comparación` ya usado para `product`. No requiere nuevo pase formal.

**Veredicto final: APPROVE.** Habilita E2E.

## E2E

### 2026-07-05 — set corrido por el usuario → todas pasan

- **E2E-1** (query de referencia — join Product → Variant → Sku → Image): ✅ 24 filas, precio 55000000, stock coherente con `stockForSize`, URLs de placehold.co.
- **E2E-2** (idempotencia del seed): ✅ segunda corrida → `catalog (new only): 0 products, 0 variants, 0 skus, 0 images`.
- **E2E-3** (RLS via supabase-js con ANON key): ✅ 6 productos visibles, 0 non-active leaked; `anon INSERT brand` → `42501`; `anon DELETE sku` → count=0.
- **E2E-4** (CHECKs de invariantes): ✅ los tres UPDATEs (stock negativo, price negativo, hex inválido) rechazados por `check constraint`.
- **E2E-5** (FTS listo para PR #6): ✅ `EXPLAIN` muestra `Bitmap Index Scan on product_name_fts_idx`.

Merge a `main`.
