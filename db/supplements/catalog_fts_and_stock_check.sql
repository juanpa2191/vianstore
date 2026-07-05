-- =============================================================================
-- VianStore — Suplemento SQL para la migración `catalog`.
--
-- Prisma no puede expresar:
--   1. GIN index para full-text search en product.name.
--   2. CHECK constraints (stock >= 0, price >= 0, hex hex-format).
--   3. Row Level Security en las 7 tablas de catálogo.
--
-- Este archivo queda de referencia; su contenido está copiado al final del
-- `migration.sql` de la migración `20260703200000_catalog`. Nunca se aplica
-- solo — es parte de la migración versionada.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Full-text search (español) en product.name.
-- ---------------------------------------------------------------------------
CREATE INDEX "product_name_fts_idx"
  ON public.product
  USING GIN (to_tsvector('spanish', name));

-- ---------------------------------------------------------------------------
-- 2. CHECK constraints de invariantes de negocio.
-- ---------------------------------------------------------------------------
ALTER TABLE public.sku
  ADD CONSTRAINT "sku_stock_non_negative_chk"
  CHECK (stock >= 0);

ALTER TABLE public.sku
  ADD CONSTRAINT "sku_price_non_negative_chk"
  CHECK (price >= 0);

ALTER TABLE public.color
  ADD CONSTRAINT "color_hex_format_chk"
  CHECK (hex ~ '^[0-9a-fA-F]{6}$');

-- ---------------------------------------------------------------------------
-- 3. Row Level Security en las 7 tablas de catálogo.
--    Modelo: public read de reference data + product `active`; admin ALL.
-- ---------------------------------------------------------------------------
ALTER TABLE public.brand         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_image ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand: public read" ON public.brand FOR SELECT USING (true);
CREATE POLICY "color: public read" ON public.color FOR SELECT USING (true);
CREATE POLICY "size: public read"  ON public.size  FOR SELECT USING (true);

CREATE POLICY "product: public read active"
  ON public.product FOR SELECT
  USING (status = 'active');

CREATE POLICY "variant: public read of active product"
  ON public.variant FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product p
      WHERE p.id = variant.product_id AND p.status = 'active'
    )
  );

CREATE POLICY "sku: public read of active product"
  ON public.sku FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.variant v
      JOIN public.product p ON p.id = v.product_id
      WHERE v.id = sku.variant_id AND p.status = 'active'
    )
  );

CREATE POLICY "product_image: public read of active product"
  ON public.product_image FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product p
      WHERE p.id = product_image.product_id AND p.status = 'active'
    )
  );

CREATE POLICY "brand: admin all" ON public.brand FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "color: admin all" ON public.color FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "size: admin all" ON public.size FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "product: admin all" ON public.product FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "variant: admin all" ON public.variant FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "sku: admin all" ON public.sku FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "product_image: admin all" ON public.product_image FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
