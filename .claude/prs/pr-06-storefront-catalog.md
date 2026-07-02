---
pr: 6
title: "Storefront: catálogo público"
phase: 1 - Catálogo
status: pending
depends_on: [4]
branch: pr-06-storefront-catalog
---

# PR #6 — Storefront: catálogo público

## Objetivo
Vistas públicas del catálogo. El cliente debe poder encontrar un zapato en su talla y ver el stock disponible.

## Alcance
- [ ] Home `/`:
  - Hero simple.
  - Grid de productos destacados (últimos activos o marcados como featured — decidir).
- [ ] Listado `/products`:
  - Grid con paginación (o infinite scroll).
  - Filtros: talla, color, marca, rango de precio.
  - Búsqueda por texto sobre `Product.name` (LIKE / ILIKE por ahora, FTS más adelante).
  - Ordenamiento: relevancia, precio asc/desc, más nuevos.
- [ ] Detalle `/products/[slug]`:
  - Galería de imágenes (por color si aplica).
  - Selector de color → filtra tallas disponibles.
  - Selector de talla con indicador de stock (`en stock`, `pocas unidades`, `agotado`).
  - Precio de la variante seleccionada.
  - Botón "Agregar al carrito" (integración en PR #7, aquí queda deshabilitado o mock).
- [ ] SEO: metadata dinámica por producto, OpenGraph tags, sitemap básico.

## Definition of Done
- Cliente puede filtrar por talla + color + marca y encontrar productos.
- Cambiar color en el detalle muestra el subset correcto de tallas.
- Seleccionar una talla agotada muestra el estado y no permite agregar.

## Notas técnicas
- Todos los listados como Server Components; el detalle interactivo puede ser híbrido (server shell + client selector).
- Paginación por cursor si tenemos >100 productos; offset alcanza para el MVP.
- Cachear queries con `revalidateTag` cuando cambie el catálogo desde admin.
