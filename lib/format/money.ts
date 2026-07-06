/**
 * Formatea centavos (COP) a "$ 450.000".
 *
 * Todos los precios en VianStore se persisten como Int en centavos (ver
 * `CLAUDE.md`). Este helper es la única puerta de conversión hacia UI —
 * evita divisiones ad-hoc que suelten redondeos.
 */
const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCentsCOP(cents: number): string {
  return COP.format(cents / 100);
}

/**
 * Rango de precios "min–max". Si son iguales devuelve un solo valor.
 * Usado en el listado admin donde SKUs distintos de un mismo producto
 * pueden llegar a tener precios diferentes (aunque en el MVP suelen ser iguales).
 */
export function formatCentsRangeCOP(minCents: number, maxCents: number): string {
  if (minCents === maxCents) return formatCentsCOP(minCents);
  return `${formatCentsCOP(minCents)} – ${formatCentsCOP(maxCents)}`;
}
