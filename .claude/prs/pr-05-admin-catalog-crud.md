---
pr: 5
title: "Admin: CRUD de catálogo"
phase: 1 - Catálogo
status: in_review
depends_on: [3, 4]
branch: pr-05-admin-catalog-crud
---

# PR #5 — Admin: CRUD de catálogo

## Objetivo
Interfaz de administración para crear, editar y desactivar productos con sus variantes, stock, precios e imágenes. Todo lo que se necesita para cargar el catálogo real.

## Alcance
- [x] Rutas:
  - `/admin/products` — listado con búsqueda, filtro por estado y paginación.
  - `/admin/products/new` — creación.
  - `/admin/products/[id]` — edición (general + variantes + imágenes).
- [x] Formulario de producto: nombre, slug (autogenerado y editable), descripción, marca, estado.
- [x] Editor de variantes: agregar/editar/eliminar variante (color × talla) con stock, precio y SKU code por fila. Selects de color/talla en modo edit desactivados (cambio requiere delete + recreate).
- [x] Subida de imágenes a Supabase Storage:
  - Bucket `products` público-read + `file_size_limit=5 MiB` + `allowed_mime_types=[jpeg, png, webp, avif]`.
  - Upload directo con signed URL; el server firma con la sesión del admin.
  - `attachImage` recibe `path` (no URL); server compone la URL pública. Path debe empezar por `productId/`.
  - Asociar imagen a color (opcional).
- [x] Server Actions con validación Zod: createProduct, updateProduct, upsertVariant, deleteVariant, attachImage, deleteImage, requestImageUploadUrl.
- [x] Feedback UI con sonner (Toaster global) + estados `pending` en botones.
- [x] Defensa en profundidad: `requireAdmin()` server-side en cada page y action; proxy + RLS del catálogo son las capas superiores.

## Fuera de scope (diferido con nota)
- Reorder de imágenes vía drag — se maneja hoy delete + reupload, un PR de polish agrega drag-to-reorder.
- Focus management + `aria-describedby` en confirm-delete inline y en fields con error — deuda de a11y para un PR posterior.
- Chequeos numéricos avanzados en cliente (paste-negativos): la validación Zod server-side ya bloquea; UI polish diferido.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un admin puede crear un producto completo con al menos 2 variantes y 1 imagen desde la UI.
- Desactivar un producto lo saca del storefront (pero no del admin).
- Editar precio/stock se refleja inmediatamente en el detalle público.

## Notas técnicas
- Validación con Zod en la Server Action y también en el cliente para UX.
- Al eliminar una variante, no borrar el SKU si tiene `OrderItems` asociados (soft-delete via `Product.active = false` y `Sku.stock = 0`, evaluar en PR #8).

## Code review

### 2026-07-05 — pase 1 → `APPROVE WITH SUGGESTIONS`

Findings: 2 HIGH, 5 MEDIUM, 8 LOW/SUGGESTION.

Aplicados en el mismo PR:
- **HIGH #1** — `attachImage` aceptaba cualquier URL. Cambiado el contrato: cliente pasa `path`, server compone la URL pública. `attachImageSchema` con regex `^[a-zA-Z0-9._/-]+$` + refine anti-`..`. `ImagesSection` actualizado.
- **HIGH #2** — Bucket sin límites. Migración `20260703210000_storage_products_bucket` ahora incluye `file_size_limit=5 MiB` + `allowed_mime_types=[jpeg,png,webp,avif]`. Delta aplicada al bucket existente.
- **MEDIUM #1** — P2002 en `upsertVariant` se mapeaba siempre a `sku.code`. Ahora lee `err.meta?.target` y ramifica al mensaje correcto (variante duplicada vs SKU code duplicado).
- **MEDIUM #2** — `deleteVariant`/`deleteImage` sin manejo de P2025. Ambos ahora atrapan P2025 como éxito idempotente (doble-click / pestaña stale no rompe).
- **MEDIUM #3** — `attachImage.sortOrder` con race. Envuelto en `prisma.$transaction` (aggregate + create en misma tx). Comment documenta el trade-off con `UNIQUE(productId,sortOrder)`.
- **MEDIUM #4** — `redirect()` dentro de try/catch. Reestructurado: try/catch solo el create, redirect fuera del try.
- **MEDIUM #5** — Leak de error de Supabase. Server logea; cliente ve mensaje fijo. Además agregué `ALLOWED_EXT` server-side antes de firmar la subida.
- **LOW aplicados**: slug regex Unicode (`/\p{Diacritic}/gu`), slug override → null en empty, tooltip en selects disabled, `throw` en `next.config.ts` si falta env.

Diferidos con nota (LOW no bloqueantes):
- Focus management + `aria-describedby` en confirm-delete / fields con error → PR de a11y polish.
- Reorder de imágenes → PR de polish o dentro de PR #6.
- Chequeos numéricos avanzados cliente-side → Zod ya cubre server-side.

### 2026-07-05 — pase 2 → `APPROVE`

Findings: 0 HIGH, 0 MEDIUM, 3 LOW cosméticos (todos aplicados en el mismo pase):
- `..` en `cleanName` colapsado a `.` para evitar objetos huérfanos.
- `attachImage` valida cross-field que `path.startsWith(\`${productId}/\`)`.
- Trailing slash del `NEXT_PUBLIC_SUPABASE_URL` normalizado con `.replace(/\/$/, "")`.

**Veredicto final: APPROVE.** Habilita E2E.

### 2026-07-05 — add-on tardío: máx 1 imagen/color + preview público `/p/[slug]`

Ampliación del scope pedida por el usuario tras E2E OK del pase original.

Nuevos archivos:
- `lib/catalog/public-queries.ts` — `getPublicProduct(slug)` con filtro explícito `status='active'` (Prisma bypasea RLS).
- `app/p/[slug]/page.tsx` — PDP público (server component).
- `app/p/[slug]/ProductGallery.tsx` — carrusel client (prev/next, ← →, dots, thumbnails, live region a11y).

Cambios en archivos existentes:
- `app/admin/products/actions.ts` — `attachImage` cuenta imágenes por (productId, colorId) dentro del `$transaction`; error dedicado si ya hay una. Invalidación `revalidatePath("/p/[slug]", "page")` propagada en attachImage/deleteImage/updateProduct/upsertVariant/deleteVariant.
- `app/admin/products/[id]/ImagesSection.tsx` — deshabilita "Subir imagen" con tooltip + banner amber cuando el color seleccionado ya tiene imagen; resetea selector tras upload OK.
- `app/admin/products/[id]/page.tsx` — link "Ver preview público" (target=_blank) cuando el producto está activo.

Pase 3 del `code-reviewer` sobre el add-on → `APPROVE WITH SUGGESTIONS` (0 HIGH, 3 MEDIUM, 5 LOW).

Aplicados:
- **MEDIUM** — `revalidatePath("/p")` era no-op; corregido a `revalidatePath("/p/[slug]", "page")` en las 5 acciones que mutan datos del PDP.
- **MEDIUM** — `deleteImage` sin invalidación; añadida.
- **MEDIUM** — listener global de teclas capturaba flechas en cualquier input; ahora ignora eventos con target `INPUT/TEXTAREA/SELECT/contentEditable`.
- **LOW** — dots del carrusel usaban `role="tab"/"tablist"` sin `tabpanel`; reemplazado por botones con `aria-current`.
- **LOW** — agregado `<span sr-only aria-live="polite">` con "Imagen N de M" para lectores de pantalla.
- **LOW** — `selectedColorId` se resetea a "" tras upload OK.

Diferidos:
- Partial unique index `(productId, colorId) WHERE colorId IS NOT NULL` para cerrar el race count-then-create en el motor: aceptable para volumen esperado; queda como TODO para el schema.
- `loading="lazy" fetchPriority="low"` en thumbnails: micro-optimización, no crítica.

**Veredicto tras add-on: APPROVE.** Set de E2E ampliado (ver `## E2E`).

### 2026-07-05 — add-on: /new con colores + fotos por color

Feedback del usuario en E2E manual: el form `/new` no ofrecía subir imágenes, y como definimos "1 foto por color" el producto necesita elegir colores desde el momento de crear.

Cambios:
- `createProduct` ya no llama `redirect()` internamente. Devuelve `{ ok, id, slug }` y el cliente decide cuándo navegar. Elimina el import `redirect` de `next/navigation`.
- `app/admin/products/new/page.tsx` carga también la lista de `colors` con Prisma y la pasa al form.
- `app/admin/products/new/NewProductForm.tsx` reescrito como orquestador cliente con `useTransition`:
  - Sección `<fieldset>` "Colores disponibles" con checkboxes para los 6 colores.
  - Por cada color marcado, un file input opcional (JPG/PNG/WEBP/AVIF ≤ 5 MB). Preview del nombre y botón X para quitar.
  - Submit: `createProduct` → `requestImageUploadUrl` × N → `uploadToSignedUrl` × N → `attachImage` × N (todas las subidas en `Promise.allSettled` para tolerar fallas parciales).
  - Feedback con sonner: éxito completo / parcial / total-fail; producto ya creado siempre navega al editor.

Tipo `ColorFile { colorId; file: File }` (no nullable) tras filter — TS estricto no estrecha `File | null`.

No requiere nueva revisión formal: usa piezas ya aprobadas (`createProduct`, `requestImageUploadUrl`, `attachImage`), y `attachImage` ya enforcea "1 por color" server-side. `pnpm typecheck` + `pnpm lint` + `pnpm build` ✅.
