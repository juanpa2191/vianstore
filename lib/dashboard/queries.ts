import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getLowStockThreshold, getServerTimeZone } from "./config";

/**
 * Devuelve `[startUtc, endUtc]` para el rango "hoy" o "el mes actual" en la
 * zona horaria del server. Usamos las funciones nativas de Postgres para no
 * arrastrar Intl / DST logic en Node — la DB conoce sus timezones (`TZ`
 * setteado a America/Bogota).
 *
 * `date_trunc('day', now() at time zone $tz)` devuelve `2026-07-09 00:00:00`
 * naïve; con `AT TIME ZONE $tz` lo convertimos de vuelta a instant UTC.
 */
async function currentDayRange(): Promise<{ start: Date; end: Date }> {
  const tz = getServerTimeZone();
  const rows = await prisma.$queryRaw<Array<{ start: Date; end: Date }>>`
    SELECT
      date_trunc('day', now() AT TIME ZONE ${tz}) AT TIME ZONE ${tz} AS start,
      (date_trunc('day', now() AT TIME ZONE ${tz}) + interval '1 day') AT TIME ZONE ${tz} AS "end"
  `;
  return rows[0];
}

async function currentMonthRange(): Promise<{ start: Date; end: Date }> {
  const tz = getServerTimeZone();
  const rows = await prisma.$queryRaw<Array<{ start: Date; end: Date }>>`
    SELECT
      date_trunc('month', now() AT TIME ZONE ${tz}) AT TIME ZONE ${tz} AS start,
      (date_trunc('month', now() AT TIME ZONE ${tz}) + interval '1 month') AT TIME ZONE ${tz} AS "end"
  `;
  return rows[0];
}

/**
 * Ventas en un rango. Definimos "venta" como el instante en que el pedido
 * dejó de estar en `pendiente_pago` — leemos `OrderStatusChange` con
 * `toStatus = 'pagado'` y contamos el `Order` al que apunta.
 *
 * Un pedido puede transicionar `pagado → cancelado` — no queremos contarlo,
 * así que filtramos por `order.status != 'cancelado'` en el JOIN.
 */
async function salesInRange(
  start: Date,
  end: Date,
): Promise<{ totalCents: number; count: number }> {
  // CTE que primero deduplica órdenes: dos transiciones a `pagado` sobre la
  // misma orden (posible si un día se agrega `pagado → pendiente_pago → pagado`)
  // aportan una sola fila al total. Alinea SUM y COUNT en el mismo criterio.
  const rows = await prisma.$queryRaw<Array<{ total_cents: bigint; count: bigint }>>`
    WITH paid_orders AS (
      SELECT DISTINCT o.id, o.total_cents
      FROM public.order o
      WHERE o.status != 'cancelado'
        AND EXISTS (
          SELECT 1 FROM public.order_status_change c
          WHERE c.order_id = o.id
            AND c.to_status = 'pagado'
            AND c.changed_at >= ${start}
            AND c.changed_at < ${end}
        )
    )
    SELECT
      COALESCE(SUM(total_cents), 0)::bigint AS total_cents,
      COUNT(*)::bigint AS count
    FROM paid_orders
  `;
  const row = rows[0] ?? { total_cents: BigInt(0), count: BigInt(0) };
  // Guard contra overflow silencioso (safe hasta ~9e15 centavos = ~90 billones
  // COP AGREGADOS). Centinela barato para operaciones si el negocio escala.
  if (row.total_cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    console.error("[dashboard] total_cents excede MAX_SAFE_INTEGER", {
      total: row.total_cents.toString(),
    });
  }
  return { totalCents: Number(row.total_cents), count: Number(row.count) };
}

export type DashboardSalesTile = {
  totalCents: number;
  count: number;
};

export const getSalesToday = cache(async (): Promise<DashboardSalesTile> => {
  const { start, end } = await currentDayRange();
  return salesInRange(start, end);
});

export const getSalesThisMonth = cache(async (): Promise<DashboardSalesTile> => {
  const { start, end } = await currentMonthRange();
  return salesInRange(start, end);
});

export type PendingOrdersBreakdown = {
  pendiente_pago: number;
  pagado: number;
  en_preparacion: number;
  total: number;
};

/**
 * Cuenta pedidos en cada uno de los estados "requieren atención admin".
 * `enviado` y `entregado` no cuentan (ya salieron); `cancelado` tampoco.
 */
type PendingStatus = "pendiente_pago" | "pagado" | "en_preparacion";

export const getPendingBreakdown = cache(
  async (): Promise<PendingOrdersBreakdown> => {
    const rows = await prisma.order.groupBy({
      by: ["status"],
      where: {
        status: { in: ["pendiente_pago", "pagado", "en_preparacion"] },
      },
      _count: { _all: true },
    });
    // Narrow type: solo los 3 estados que devolvemos. TS bloquea indexar por
    // uno inválido (ej: `bucket['enviado']`).
    const bucket: Record<PendingStatus, number> = {
      pendiente_pago: 0,
      pagado: 0,
      en_preparacion: 0,
    };
    for (const r of rows) {
      if (r.status in bucket) bucket[r.status as PendingStatus] = r._count._all;
    }
    return {
      ...bucket,
      total: bucket.pendiente_pago + bucket.pagado + bucket.en_preparacion,
    };
  },
);

export type LowStockRow = {
  skuId: string;
  code: string;
  stock: number;
  /** UUID del producto — permite linkear directo a `/admin/products/[id]`
   *  sin pasar por el buscador (evita colisión con slugs prefijo). */
  productId: string;
  productName: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
};

/**
 * Top N SKUs con stock ≤ umbral, ordenados por stock ASC (más urgente primero).
 * Solo considera SKUs de productos `active` — un draft/archivado no requiere
 * reposición inmediata.
 */
export const getLowStockSkus = cache(async (limit = 5): Promise<LowStockRow[]> => {
  const threshold = getLowStockThreshold();
  const rows = await prisma.sku.findMany({
    where: {
      stock: { lte: threshold },
      variant: { product: { status: "active" } },
    },
    orderBy: [{ stock: "asc" }, { code: "asc" }],
    take: limit,
    select: {
      id: true,
      code: true,
      stock: true,
      variant: {
        select: {
          color: { select: { name: true, hex: true } },
          size: { select: { label: true } },
          product: { select: { id: true, name: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    skuId: r.id,
    code: r.code,
    stock: r.stock,
    productId: r.variant.product.id,
    productName: r.variant.product.name,
    colorName: r.variant.color.name,
    colorHex: r.variant.color.hex,
    sizeLabel: r.variant.size.label,
  }));
});

/**
 * Conteo total de SKUs bajo el umbral — usado en el KPI tile ("N SKUs").
 * Complementa `getLowStockSkus` cuando hay más SKUs que la lista muestra.
 */
export const getLowStockCount = cache(async (): Promise<number> => {
  const threshold = getLowStockThreshold();
  return prisma.sku.count({
    where: {
      stock: { lte: threshold },
      variant: { product: { status: "active" } },
    },
  });
});
