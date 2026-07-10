-- Índice parcial para el dashboard (PR #13): la query filtra por
-- `to_status = 'pagado' AND changed_at BETWEEN ...`. El índice compuesto
-- existente `(order_id, changed_at DESC)` no aplica porque falta el leading
-- column. Este parcial es barato de mantener y match perfecto.
CREATE INDEX "order_status_change_paid_changed_at_idx"
  ON public.order_status_change (changed_at)
  WHERE to_status = 'pagado';
