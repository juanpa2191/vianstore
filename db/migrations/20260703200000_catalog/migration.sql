-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateTable
CREATE TABLE "brand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,

    CONSTRAINT "color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "size" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "brand_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "color_id" UUID NOT NULL,
    "size_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "color_id" UUID,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_name_key" ON "brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brand_slug_key" ON "brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "color_name_key" ON "color"("name");

-- CreateIndex
CREATE UNIQUE INDEX "size_label_key" ON "size"("label");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "product_brand_id_idx" ON "product"("brand_id");

-- CreateIndex
CREATE INDEX "product_status_idx" ON "product"("status");

-- CreateIndex
CREATE INDEX "variant_product_id_idx" ON "variant"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "variant_product_id_color_id_size_id_key" ON "variant"("product_id", "color_id", "size_id");

-- CreateIndex
CREATE UNIQUE INDEX "sku_variant_id_key" ON "sku"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sku_code_key" ON "sku"("code");

-- CreateIndex
CREATE INDEX "sku_price_stock_idx" ON "sku"("price", "stock");

-- CreateIndex
CREATE INDEX "product_image_product_id_sort_order_idx" ON "product_image"("product_id", "sort_order");

-- CreateIndex
CREATE INDEX "product_image_product_id_color_id_idx" ON "product_image"("product_id", "color_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_image_product_id_url_key" ON "product_image"("product_id", "url");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant" ADD CONSTRAINT "variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant" ADD CONSTRAINT "variant_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant" ADD CONSTRAINT "variant_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku" ADD CONSTRAINT "sku_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- VianStore — Suplemento SQL para la migración `catalog`.
--
-- Prisma no puede expresar:
--   1. GIN index para full-text search en product.name — se deja preparado
--      para PR #6 (búsqueda del storefront).
--   2. CHECK constraints de invariantes de negocio (stock >= 0, price >= 0,
--      hex hex-format).
--   3. Row Level Security en las 7 tablas de catálogo. El runtime server-side
--      usa Prisma con el pooler (bypasea RLS), pero el ANON key expuesto al
--      browser (PR #6 storefront) debe quedar bloqueado para writes y solo
--      leer productos `active` (y sus variantes/skus/imágenes visibles).
--
-- Este bloque queda versionado como parte de la migración y se aplica
-- junto con el DDL generado.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Full-text search (español) en product.name.
--    IMMUTABLE porque el índice necesita determinismo — 'spanish' es un regconfig
--    fijo. En PR #6 se consultará vía: WHERE to_tsvector('spanish', name) @@ query.
-- ---------------------------------------------------------------------------
CREATE INDEX "product_name_fts_idx"
  ON public.product
  USING GIN (to_tsvector('spanish', name));

-- ---------------------------------------------------------------------------
-- 2. Guardias de invariantes de negocio a nivel DB. Redundantes con la
--    validación en la app, pero atrapan bugs si algún path del backend o un
--    UPDATE manual desde SQL caen aquí.
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
--
--    Modelo:
--      - `brand`, `color`, `size`  → lectura pública (data de referencia).
--      - `product`                 → lectura pública SOLO si `status = 'active'`.
--      - `variant`, `sku`, `product_image` → lectura pública si su producto
--        padre es visible (`EXISTS` referencia a public.product, que a su vez
--        aplica su propia RLS → cadena consistente).
--      - Admin (`app_metadata.role='admin'` en JWT) → ALL en las 7.
--      - INSERT/UPDATE/DELETE público → sin policy, todo negado.
--
--    Como PR #2, esto es defensa en profundidad: Prisma con el pooler bypasea
--    RLS (rol postgres). El ANON key expuesto al browser SÍ pasa por RLS.
-- ---------------------------------------------------------------------------

-- --- Enable RLS -------------------------------------------------------------
ALTER TABLE public.brand         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_image ENABLE ROW LEVEL SECURITY;

-- --- Public read: reference data (brand/color/size) -------------------------
CREATE POLICY "brand: public read" ON public.brand FOR SELECT USING (true);
CREATE POLICY "color: public read" ON public.color FOR SELECT USING (true);
CREATE POLICY "size: public read"  ON public.size  FOR SELECT USING (true);

-- --- Public read: product (active only) -------------------------------------
CREATE POLICY "product: public read active"
  ON public.product FOR SELECT
  USING (status = 'active');

-- --- Public read: variant/sku/product_image (via active product) ------------
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

-- --- Admin: ALL on all catalog tables ---------------------------------------
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
