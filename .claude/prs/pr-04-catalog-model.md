---
pr: 4
title: Modelo de catálogo
phase: 1 - Catálogo
status: pending
depends_on: [2]
branch: pr-04-catalog-model
---

# PR #4 — Modelo de catálogo

## Objetivo
Modelo de datos completo de catálogo: producto con variantes talla × color, cada variante con SKU único, stock y precio propios. Este es el corazón del negocio.

## Alcance
- [ ] Modelos Prisma:
  - `Brand` — id, name, slug.
  - `Color` — id, name, hex.
  - `Size` — id, label (ej "38", "39"), sortOrder.
  - `Product` — id, slug, name, description, brandId, active, createdAt.
  - `Variant` — id, productId, colorId, sizeId. Único por (productId, colorId, sizeId).
  - `Sku` — id, variantId (único), code (SKU imprimible), price (centavos), stock, createdAt.
  - `ProductImage` — id, productId, url, sortOrder, colorId (opcional, para mostrar imagen por color).
- [ ] Enum de estado del producto (`active`, `draft`, `archived`).
- [ ] Índices:
  - `Product.slug` único.
  - `Product.brandId`.
  - Índice compuesto en `Sku(price, stock)` para filtros.
  - Full-text search en `Product.name` (a evaluar en PR #6, dejar preparado).
- [ ] Migración correspondiente.
- [ ] Seeds con:
  - 3 marcas.
  - 6 colores base, 8 tallas (35 a 42).
  - 5–10 productos con variantes y stock realista.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- `pnpm prisma migrate dev` corre limpio.
- Seeds ejecutan sin duplicados en re-ejecuciones.
- Query de prueba retorna un producto con sus variantes, imágenes y stock por SKU.

## Notas técnicas
- Precio en **centavos** (int) para evitar problemas de precisión decimal.
- SKU code puede seguir el patrón `<brand>-<product>-<color>-<size>` o dejarse auto-generado. Decidir en implementación.
- La relación `Variant → Sku` es 1:1 en el MVP; se modela como tabla separada por si mañana necesitamos precios por canal o costo.
