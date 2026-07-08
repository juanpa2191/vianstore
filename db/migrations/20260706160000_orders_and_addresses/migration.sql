-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pendiente_pago', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado');

-- CreateTable
CREATE TABLE "address" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CO',
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "user_email" TEXT NOT NULL,
    "address_snapshot" JSONB NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pendiente_pago',
    "subtotal_cents" INTEGER NOT NULL,
    "shipping_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "sku_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "subtotal_cents" INTEGER NOT NULL,
    "sku_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "color_name" TEXT NOT NULL,
    "size_label" TEXT NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "address_user_id_key" ON "address"("user_id");

-- CreateIndex
CREATE INDEX "order_user_id_created_at_idx" ON "order"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "order_status_idx" ON "order"("status");

-- CreateIndex
CREATE INDEX "order_item_order_id_idx" ON "order_item"("order_id");

-- CreateIndex
CREATE INDEX "order_item_sku_id_idx" ON "order_item"("sku_id");

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- VianStore — Suplemento SQL para la migración `orders_and_addresses` (PR #8).
--
-- Prisma no puede expresar:
--   1. FKs address.user_id / order.user_id → auth.users(id) (schema auth ignorado).
--   2. CHECKs de invariantes: qty > 0, precios >= 0.
--   3. RLS en address, order y order_item.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FKs a auth.users.
--    Address: cascade — si el user se elimina, su address desaparece.
--    Order: set null — al borrar el user se anonimiza el pedido pero
--    preservamos el histórico. `user_email` conserva la trazabilidad para
--    soporte y refunds. El pedido queda invisible al listado del propio
--    user (owner select policy) pero el admin sigue viéndolo.
-- ---------------------------------------------------------------------------
ALTER TABLE public.address
  ADD CONSTRAINT address_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.order
  ADD CONSTRAINT order_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 2. CHECK constraints de invariantes de negocio.
-- ---------------------------------------------------------------------------
ALTER TABLE public.order
  ADD CONSTRAINT order_totals_non_negative_chk
  CHECK (subtotal_cents >= 0 AND shipping_cents >= 0 AND total_cents >= 0);

ALTER TABLE public.order_item
  ADD CONSTRAINT order_item_qty_positive_chk
  CHECK (qty > 0);

ALTER TABLE public.order_item
  ADD CONSTRAINT order_item_prices_non_negative_chk
  CHECK (unit_price_cents >= 0 AND subtotal_cents >= 0);

-- ---------------------------------------------------------------------------
-- 3. RLS.
--    Address: owner select/update/delete. INSERT solo por Prisma (upsert
--    server-side). Admin ALL.
--    Order + OrderItem: owner select. Sin write policies desde ANON: los
--    pedidos solo se crean/modifican server-side (createOrder, admin CRUD).
--    Admin ALL.
-- ---------------------------------------------------------------------------
ALTER TABLE public.address    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "address: owner select"
  ON public.address FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "address: owner update"
  ON public.address FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "address: owner delete"
  ON public.address FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "address: admin all"
  ON public.address FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "order: owner select"
  ON public.order FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "order: admin all"
  ON public.order FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "order_item: via order select"
  ON public.order_item FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order o
      WHERE o.id = order_item.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_item: admin all"
  ON public.order_item FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
