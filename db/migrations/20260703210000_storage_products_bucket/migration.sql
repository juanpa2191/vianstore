-- =============================================================================
-- VianStore — PR #5 · Bucket `products` en Supabase Storage.
--
-- Supabase gestiona `storage.buckets` y `storage.objects` (schema `storage`,
-- fuera del alcance de Prisma). Aquí registramos:
--   1. El bucket `products` como público de lectura (para <img> del storefront).
--   2. Policies RLS de `storage.objects`:
--        - lectura pública para el bucket products;
--        - INSERT / UPDATE / DELETE solo si el JWT trae app_metadata.role='admin'.
--
-- Idempotente: usa ON CONFLICT para el bucket y IF NOT EXISTS (via DROP POLICY IF EXISTS
-- + CREATE POLICY) para reejecuciones locales.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Registrar el bucket `products` (público).
--    `public = true` → los archivos son servibles via URL sin firma.
--    `file_size_limit = 5 MiB` y `allowed_mime_types` fuerzan el chequeo en
--    Storage — la validación del cliente (`ImagesSection`) es UX; ésta es la
--    guardia real. Evita subida de MP4/SVG/HTML/binarios grandes.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. Policies de storage.objects.
--    Supabase ya tiene RLS habilitado en storage.objects por default. Aquí
--    solo agregamos policies scoped al bucket `products`.
-- ---------------------------------------------------------------------------

-- Lectura pública de products (para el storefront y el admin).
DROP POLICY IF EXISTS "products bucket: public read" ON storage.objects;
CREATE POLICY "products bucket: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Escritura (INSERT / UPDATE / DELETE) solo para admins.
DROP POLICY IF EXISTS "products bucket: admin insert" ON storage.objects;
CREATE POLICY "products bucket: admin insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "products bucket: admin update" ON storage.objects;
CREATE POLICY "products bucket: admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'products'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id = 'products'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "products bucket: admin delete" ON storage.objects;
CREATE POLICY "products bucket: admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'products'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
