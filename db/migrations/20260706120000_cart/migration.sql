-- CreateTable
CREATE TABLE "cart" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "sku_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cart_user_id_key" ON "cart"("user_id");

-- CreateIndex
CREATE INDEX "cart_user_id_idx" ON "cart"("user_id");

-- CreateIndex
CREATE INDEX "cart_item_sku_id_idx" ON "cart_item"("sku_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cart_id_sku_id_key" ON "cart_item"("cart_id", "sku_id");

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- VianStore — Suplemento SQL para la migración `cart` (PR #7).
--
-- Prisma no puede expresar:
--   1. FK cart.user_id → auth.users(id) (schema auth ignorado).
--   2. CHECK qty > 0 en cart_item.
--   3. RLS en cart y cart_item. El runtime usa Prisma con el pooler (bypasea
--      RLS), pero el ANON key expuesto al browser NO debe poder leer o mutar
--      carts de otros usuarios.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FK cart.user_id → auth.users(id). Si el user se elimina, su cart también.
-- ---------------------------------------------------------------------------
ALTER TABLE public.cart
  ADD CONSTRAINT cart_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Guardia de qty positiva.
-- ---------------------------------------------------------------------------
ALTER TABLE public.cart_item
  ADD CONSTRAINT "cart_item_qty_positive_chk"
  CHECK (qty > 0);

-- ---------------------------------------------------------------------------
-- 3. Row Level Security.
--    Modelo:
--      - Cart anónimo (user_id IS NULL) → sin acceso desde ANON key. La
--        interacción pasa por Server Actions con Prisma (postgres role,
--        bypasea RLS).
--      - Cart de un usuario → dueño puede SELECT/UPDATE/DELETE. Admin ALL.
--      - INSERT desde ANON key: bloqueado (los carts se crean server-side).
-- ---------------------------------------------------------------------------
ALTER TABLE public.cart      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart: owner select"
  ON public.cart FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cart: owner update"
  ON public.cart FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart: owner delete"
  ON public.cart FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "cart: admin all"
  ON public.cart FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- cart_item: read-only para el owner. Los writes solo pasan por Prisma
-- (server-side, bypasea RLS) — evita que un user autenticado con ANON key
-- inserte cart_items con qty > stock saltándose la Server Action.
CREATE POLICY "cart_item: via cart select"
  ON public.cart_item FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_item.cart_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "cart_item: admin all"
  ON public.cart_item FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
