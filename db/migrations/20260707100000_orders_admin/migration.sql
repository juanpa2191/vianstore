-- AlterTable
ALTER TABLE "order"
  ADD COLUMN "shipped_at" TIMESTAMPTZ(6),
  ADD COLUMN "delivered_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "order_status_change" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by_user_id" UUID,
    "changed_by_email" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "order_status_change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_status_change_order_id_changed_at_idx"
  ON "order_status_change"("order_id", "changed_at" DESC);

-- AddForeignKey
ALTER TABLE "order_status_change"
  ADD CONSTRAINT "order_status_change_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- VianStore — Suplemento SQL para `orders_admin` (PR #11).
--
-- Prisma no puede expresar:
--   1. FK order_status_change.changed_by_user_id → auth.users(id) SET NULL.
--   2. RLS en order_status_change:
--        - Admin: ALL.
--        - Owner del pedido: SELECT (para que el detalle del cliente en PR #10
--          pueda mostrar la línea de tiempo real si se quiere en el futuro).
--        - Sin INSERT/UPDATE/DELETE para ANON — solo via Server Actions admin.
-- =============================================================================

ALTER TABLE public.order_status_change
  ADD CONSTRAINT order_status_change_changed_by_user_id_fkey
  FOREIGN KEY (changed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order_status_change ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_status_change: via order select"
  ON public.order_status_change FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order o
      WHERE o.id = order_status_change.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_status_change: admin all"
  ON public.order_status_change FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
