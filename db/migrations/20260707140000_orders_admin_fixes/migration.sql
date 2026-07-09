-- Idempotencia explícita del cancel: marca cuándo se devolvió el stock.
ALTER TABLE "order" ADD COLUMN "stock_restored_at" TIMESTAMPTZ(6);

-- CHECK: `changed_by_email` debe tener contenido (auditoría).
ALTER TABLE "order_status_change"
  ADD CONSTRAINT "order_status_change_changed_by_email_not_blank_chk"
  CHECK (char_length(changed_by_email) > 0);

-- Historial append-only: reemplazar policy admin FOR ALL por SELECT+INSERT.
DROP POLICY IF EXISTS "order_status_change: admin all" ON public.order_status_change;

CREATE POLICY "order_status_change: admin select"
  ON public.order_status_change FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "order_status_change: admin insert"
  ON public.order_status_change FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
