-- =============================================================================
-- VianStore — Suplemento SQL para la migración `cart` (PR #7).
--
-- Prisma no puede expresar:
--   1. FK cart.user_id → auth.users(id).
--   2. CHECK qty > 0 en cart_item.
--   3. RLS en cart y cart_item.
--
-- Este archivo queda de referencia; su contenido está copiado al final del
-- `migration.sql` de la migración `20260706120000_cart`.
-- =============================================================================

ALTER TABLE public.cart
  ADD CONSTRAINT cart_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.cart_item
  ADD CONSTRAINT "cart_item_qty_positive_chk"
  CHECK (qty > 0);

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

CREATE POLICY "cart_item: via cart select"
  ON public.cart_item FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cart c
      WHERE c.id = cart_item.cart_id AND c.user_id = auth.uid()
    )
  );

-- Sin policy write para owner: los INSERT/UPDATE/DELETE solo pasan por Prisma.

CREATE POLICY "cart_item: admin all"
  ON public.cart_item FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
