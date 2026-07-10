/**
 * Umbral de "stock bajo" para el dashboard admin. Configurable via env sin
 * redeploy. Default 3 unidades — SKUs con stock ≤ 3 aparecen en la lista.
 */
export function getLowStockThreshold(): number {
  const raw = process.env.LOW_STOCK_THRESHOLD;
  if (!raw) return 3;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    console.warn(
      `[dashboard] LOW_STOCK_THRESHOLD inválido (${raw}); usando default 3.`,
    );
    return 3;
  }
  return n;
}

/**
 * Zona horaria del server para computar "hoy" y "este mes". Definida en env
 * global (`TZ=America/Bogota`) — este helper solo la expone tipada.
 */
export function getServerTimeZone(): string {
  return process.env.TZ || "America/Bogota";
}
