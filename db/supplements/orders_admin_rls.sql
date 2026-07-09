-- =============================================================================
-- VianStore — Suplemento SQL para la migración `orders_admin` (PR #11).
--
-- Prisma no puede expresar:
--   1. FK order_status_change.changed_by_user_id → auth.users(id) SET NULL.
--   2. RLS en order_status_change.
--
-- Este archivo queda de referencia; su contenido está copiado al final del
-- migration.sql de `20260707100000_orders_admin`.
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

-- Historial append-only: admin puede SELECT + INSERT pero no UPDATE ni DELETE.
CREATE POLICY "order_status_change: admin select"
  ON public.order_status_change FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "order_status_change: admin insert"
  ON public.order_status_change FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Auditoría: `changed_by_email` no puede quedar en blanco.
ALTER TABLE public.order_status_change
  ADD CONSTRAINT "order_status_change_changed_by_email_not_blank_chk"
  CHECK (char_length(changed_by_email) > 0);
