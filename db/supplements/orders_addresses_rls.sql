-- =============================================================================
-- VianStore — Suplemento SQL para la migración `orders_and_addresses` (PR #8).
--
-- Prisma no puede expresar:
--   1. FKs address.user_id / order.user_id → auth.users(id).
--   2. CHECKs de invariantes (qty > 0, totales/precios >= 0).
--   3. RLS en address, order y order_item.
--
-- Este archivo queda de referencia; su contenido está copiado al final del
-- `migration.sql` de la migración `20260706160000_orders_and_addresses`.
-- =============================================================================

ALTER TABLE public.address
  ADD CONSTRAINT address_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.order
  ADD CONSTRAINT order_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.order
  ADD CONSTRAINT order_totals_non_negative_chk
  CHECK (subtotal_cents >= 0 AND shipping_cents >= 0 AND total_cents >= 0);

ALTER TABLE public.order_item
  ADD CONSTRAINT order_item_qty_positive_chk
  CHECK (qty > 0);

ALTER TABLE public.order_item
  ADD CONSTRAINT order_item_prices_non_negative_chk
  CHECK (unit_price_cents >= 0 AND subtotal_cents >= 0);

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
