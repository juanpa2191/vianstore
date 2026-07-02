---
pr: 5
title: "Admin: CRUD de catálogo"
phase: 1 - Catálogo
status: pending
depends_on: [3, 4]
branch: pr-05-admin-catalog-crud
---

# PR #5 — Admin: CRUD de catálogo

## Objetivo
Interfaz de administración para crear, editar y desactivar productos con sus variantes, stock, precios e imágenes. Todo lo que se necesita para cargar el catálogo real.

## Alcance
- [ ] Rutas:
  - `/admin/products` — listado con búsqueda y filtro por estado.
  - `/admin/products/new` — creación.
  - `/admin/products/[id]` — edición.
- [ ] Formulario de producto: nombre, slug (autogenerado y editable), descripción, marca, estado.
- [ ] Editor de variantes:
  - Seleccionar tallas y colores → generar la matriz de variantes.
  - Editar stock y precio por SKU.
  - Ajustar SKU code manualmente si se requiere.
- [ ] Subida de imágenes a Supabase Storage:
  - Bucket `products` (público de lectura para storefront).
  - Upload directo desde el cliente con URL firmada, guardar URL en `ProductImage`.
  - Asociar imagen a color (opcional).
- [ ] Server Actions para create/update/deactivate con validación (Zod).
- [ ] Feedback UI (toasts) y estados de carga.

## Definition of Done
- Un admin puede crear un producto completo con al menos 2 variantes y 1 imagen desde la UI.
- Desactivar un producto lo saca del storefront (pero no del admin).
- Editar precio/stock se refleja inmediatamente en el detalle público.

## Notas técnicas
- Validación con Zod en la Server Action y también en el cliente para UX.
- Al eliminar una variante, no borrar el SKU si tiene `OrderItems` asociados (soft-delete via `Product.active = false` y `Sku.stock = 0`, evaluar en PR #8).
