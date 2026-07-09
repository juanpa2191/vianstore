import { cache } from "react";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AddressSnapshotSchema, type AddressSnapshot } from "@/lib/checkout/snapshot";

export type AdminOrderListRow = {
  id: string;
  shortId: string;
  status: OrderStatus;
  totalCents: number;
  userEmail: string;
  customerName: string | null;
  createdAt: Date;
};

export type AdminOrderListFilters = {
  q?: string;
  status?: OrderStatus | "all";
  page?: number;
  pageSize?: number;
};

export type AdminOrderListResult = {
  rows: AdminOrderListRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 20;

/**
 * Listado admin de pedidos. Filtros:
 *   - status: exacto o "all".
 *   - q: busca por `userEmail` (ILIKE), UUID completo (match exacto) o
 *     shortId (primeros ≤8 chars hex del UUID vía `$queryRaw` — Prisma no
 *     expone `startsWith` sobre columnas UUID). La búsqueda por customer
 *     name dentro del JSON del snapshot se dejó fuera del MVP.
 */
export async function listAdminOrders(
  filters: AdminOrderListFilters = {},
): Promise<AdminOrderListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = filters.q?.trim();
  const status = filters.status && filters.status !== "all" ? filters.status : undefined;

  // Búsqueda: email (contains ILIKE), UUID completo (equal), o "shortId" (los
  // primeros 8 hex chars del UUID). Prisma no expone `startsWith` sobre UUID,
  // así que si `q` es hex ≤ 8 chars usamos raw para pre-resolver los ids.
  const orClauses: Prisma.OrderWhereInput[] = [];
  if (q) {
    orClauses.push({ userEmail: { contains: q, mode: "insensitive" } });
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRe.test(q)) {
      orClauses.push({ id: q });
    } else if (/^[0-9a-f]{1,8}$/i.test(q)) {
      const shortPattern = `${q.toLowerCase()}%`;
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM public.order
        WHERE id::text ILIKE ${shortPattern}
        LIMIT 200
      `;
      if (rows.length > 0) {
        orClauses.push({ id: { in: rows.map((r) => r.id) } });
      }
    }
  }

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(orClauses.length > 0 ? { OR: orClauses } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        totalCents: true,
        userEmail: true,
        addressSnapshot: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    rows: rows.map((o) => {
      const snap = AddressSnapshotSchema.safeParse(o.addressSnapshot);
      return {
        id: o.id,
        shortId: o.id.slice(0, 8),
        status: o.status,
        totalCents: o.totalCents,
        userEmail: o.userEmail,
        customerName: snap.success ? snap.data.fullName : null,
        createdAt: o.createdAt,
      };
    }),
    total,
    page,
    pageSize,
  };
}

export type AdminOrderStatusChange = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByEmail: string;
  changedAt: Date;
  note: string | null;
};

export type AdminOrderDetail = {
  id: string;
  shortId: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  userEmail: string;
  userId: string | null;
  address: AddressSnapshot | null;
  trackingCarrier: string | null;
  trackingCode: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  emailSentAt: Date | null;
  emailError: string | null;
  items: Array<{
    id: string;
    productName: string;
    colorName: string;
    sizeLabel: string;
    skuCode: string;
    qty: number;
    unitPriceCents: number;
    subtotalCents: number;
  }>;
  history: AdminOrderStatusChange[];
};

/**
 * Detalle admin (sin filtro por userId — admin ve todos los pedidos). Trae
 * PII interna (userEmail, emailSentAt, emailError) porque el admin necesita
 * ver el estado del envío de correos y contactar al cliente.
 */
export const getAdminOrder = cache(
  async (id: string): Promise<AdminOrderDetail | null> => {
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        subtotalCents: true,
        shippingCents: true,
        totalCents: true,
        userEmail: true,
        userId: true,
        addressSnapshot: true,
        trackingCarrier: true,
        trackingCode: true,
        shippedAt: true,
        deliveredAt: true,
        emailSentAt: true,
        emailError: true,
        items: {
          orderBy: { productName: "asc" },
          select: {
            id: true,
            productName: true,
            colorName: true,
            sizeLabel: true,
            skuCode: true,
            qty: true,
            unitPriceCents: true,
            subtotalCents: true,
          },
        },
        statusChanges: {
          orderBy: { changedAt: "desc" },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            changedByEmail: true,
            changedAt: true,
            note: true,
          },
        },
      },
    });
    if (!order) return null;

    const parsed = AddressSnapshotSchema.safeParse(order.addressSnapshot);
    if (!parsed.success) {
      console.error("[admin/orders] address snapshot corrupto", {
        orderId: order.id,
      });
    }

    return {
      id: order.id,
      shortId: order.id.slice(0, 8),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      totalCents: order.totalCents,
      userEmail: order.userEmail,
      userId: order.userId,
      address: parsed.success ? parsed.data : null,
      trackingCarrier: order.trackingCarrier,
      trackingCode: order.trackingCode,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      emailSentAt: order.emailSentAt,
      emailError: order.emailError,
      items: order.items,
      history: order.statusChanges,
    };
  },
);
