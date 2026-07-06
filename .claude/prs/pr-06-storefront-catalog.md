---
pr: 6
title: "Storefront: catálogo público"
phase: 1 - Catálogo
status: in_review
depends_on: [4]
branch: pr-06-storefront-catalog
---

# PR #6 — Storefront: catálogo público

## Objetivo
Vistas públicas del catálogo. El cliente debe poder encontrar un zapato en su talla y ver el stock disponible.

## Alcance
- [x] Home `/`:
  - Hero (heredado de PR #1) con CTA "Ver catálogo".
  - Grid de últimos 8 productos activos (proxy de destacados; decisión doc en Notas técnicas).
- [x] Listado `/products`:
  - Grid con paginación por offset.
  - Filtros: talla, color, marca, rango de precio (COP).
  - Búsqueda por `q` sobre `Product.name` y `slug` (ILIKE).
  - Ordenamiento: más nuevos (`newest`), precio asc/desc.
- [x] Detalle `/p/[slug]` (heredado de PR #5, extendido):
  - Galería reactiva (imagen del color activo primero).
  - Selector color → filtra tallas → precio + estado stock (`en stock`, `pocas unidades`, `sin stock`).
  - CTA "Agregar al carrito" habilitado solo con selección; hoy solo toast placeholder para PR #7.
- [x] SEO: `generateMetadata` con OpenGraph + Twitter cards + JSON-LD schema.org Product/AggregateOffer + `sitemap.xml` + `robots.txt`. `metadataBase` en root layout.

## Fuera de scope (diferido con nota)
- Sitemap paginación (irrelevante hasta miles de productos).
- Sort por precio en SQL agregado (hoy in-memory con hard-limit 500).
- Focus management al cambiar color (a11y polish).
- Restringir listado a variantes con `stock > 0` (decidir junto con PR #7).

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Cliente puede filtrar por talla + color + marca y encontrar productos.
- Cambiar color en el detalle muestra el subset correcto de tallas.
- Seleccionar una talla agotada muestra el estado y no permite agregar.

## Notas técnicas
- Todos los listados como Server Components; el detalle interactivo puede ser híbrido (server shell + client selector).
- Paginación por cursor si tenemos >100 productos; offset alcanza para el MVP.
- Cachear queries con `revalidateTag` cuando cambie el catálogo desde admin.
- Decisión "destacados en el home": últimos 8 activos ordenados por `updatedAt desc`. Cero cambios de schema. El admin "destaca" un producto simplemente editándolo. Alternativa `featured boolean` diferida hasta que el catálogo justifique la complejidad.
- Ruta del detalle: se mantiene `/p/[slug]` (heredada de PR #5 add-on) en vez de `/products/[slug]` del scope original — más corta y consistente con el patrón e-commerce clásico. `/products` queda como listado.

## Code review

### 2026-07-06 — pase 1 → `APPROVE WITH SUGGESTIONS`

Findings: 4 HIGH, 4 MEDIUM, 7 LOW.

Aplicados:
- **HIGH #1** — `getPublicProduct` doble llamada por PDP: envuelto con `import { cache } from "react"`.
- **HIGH #2** — JSON-LD sin escape correcto (comentario mentía). Nueva función `escapeForScript` con regex + map dinámicos (construidos con `String.fromCharCode` para evitar meter U+2028/U+2029 en el source, que rompen el parser TS).
- **HIGH #3** — Price sort sin límite. Constante `PRICE_SORT_HARD_LIMIT = 500` + warning al saturar. Sort in-memory documentado.
- **HIGH #4** — `AggregateOffer.offerCount` incluía SKUs agotados. Ahora deriva `inStockSkus` + `availability: InStock`; `offers: undefined` si no hay stock.
- **MEDIUM #1** — Ternario dead-code en orderBy: colapsado.
- **MEDIUM #2** — Facetas de color/talla filtran por `stock > 0`.
- **MEDIUM #3** — `aria-pressed` faltante en marcas y tallas del sidebar.
- **MEDIUM #4** — `metadataBase` en root layout. Nuevo `lib/env.ts` con `getSiteUrl()` — warn (no throw) en Vercel sin env.
- **LOW** — `.split(" – ")[0]` frágil reemplazado por `formatCentsCOP(min)` directo. `robots.host` deprecado removido. `priceHint` con `max > 0`.

Diferidos con nota (arriba en "Fuera de scope").

### 2026-07-06 — pase 2 → `APPROVE`

Findings: 0 HIGH, 0 MEDIUM, 4 LOW. Aplicados los 4:
- `metadataBase` ahora usa `getSiteUrl()` (single source of truth con sitemap/robots).
- `<ProductGallery key={colorId ?? "default"}>` fuerza reset del índice al cambiar color.
- `priceRangeCents` aggregate filtra por `stock > 0` (consistente con `colors`/`sizes`).
- `PRICE_SORT_HARD_LIMIT: number` con anotación explícita en vez de cast en call site.

**Veredicto final: APPROVE.** Habilita E2E.
