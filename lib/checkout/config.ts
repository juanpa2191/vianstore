/**
 * Costo de envío fijo (centavos). Ajustable sin redeploy via env.
 * Default 0 = envío gratis. Se cachea a nivel módulo — la env no cambia en
 * runtime, así evitamos re-parsear + posible warn en cada request.
 */
let _cached: number | null = null;

export function getShippingCostCents(): number {
  if (_cached !== null) return _cached;
  const raw = process.env.SHIPPING_COST_CENTS;
  if (!raw) {
    _cached = 0;
    return 0;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    console.warn(`[checkout] SHIPPING_COST_CENTS inválido (${raw}); usando 0.`);
    _cached = 0;
    return 0;
  }
  _cached = n;
  return n;
}
