import { cache } from "react";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AddressSnapshotSchema, type AddressSnapshot } from "@/lib/checkout/snapshot";

export type OrderListRow = {
  id: string;
  shortId: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  createdAt: Date;
};

/**
 * Lista de pedidos del usuario. Filtro por `userId` OBLIGATORIO en el server —
 * nunca confiar en un `id` de URL como fuente de autorización.
 */
export const listMyOrders = cache(
  async (userId: string): Promise<OrderListRow[]> => {
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalCents: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });
    return orders.map((o) => ({
      id: o.id,
      shortId: o.id.slice(0, 8),
      status: o.status,
      totalCents: o.totalCents,
      itemCount: o._count.items,
      createdAt: o.createdAt,
    }));
  },
);

export type OrderDetailItem = {
  id: string;
  productName: string;
  colorName: string;
  sizeLabel: string;
  skuCode: string;
  qty: number;
  unitPriceCents: number;
  subtotalCents: number;
};

export type OrderDetail = {
  id: string;
  shortId: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  /** null si el JSON del snapshot está corrupto (edge case: restore parcial,
   *  migración manual). El caller renderiza "dirección no disponible" en vez
   *  de romper la ruta entera. */
  address: AddressSnapshot | null;
  trackingCarrier: string | null;
  trackingCode: string | null;
  items: OrderDetailItem[];
};

/**
 * Detalle de un pedido con guardia de autorización server-side. Devuelve null
 * si el pedido no existe o no pertenece al `userId`. La validación del
 * `addressSnapshot` vive en este helper (no en la ruta) para que TODOS los
 * consumidores obtengan el mismo shape validado sin repetir el Zod.
 */
export const getMyOrder = cache(
  async (userId: string, id: string): Promise<OrderDetail | null> => {
    const order = await prisma.order.findFirst({
      where: { id, userId },
      // `select` explícito acota los campos a los que la vista pública necesita.
      // Deja fuera `userEmail`, `emailSentAt`, `emailError` — datos internos
      // que no deben filtrarse al layer de UI ni siquiera por logs accidentales.
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        subtotalCents: true,
        shippingCents: true,
        totalCents: true,
        addressSnapshot: true,
        trackingCarrier: true,
        trackingCode: true,
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
      },
    });
    if (!order) return null;

    const parsed = AddressSnapshotSchema.safeParse(order.addressSnapshot);
    if (!parsed.success) {
      console.error("[orders] address snapshot corrupto", {
        orderId: order.id,
        issues: parsed.error.issues,
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
      address: parsed.success ? parsed.data : null,
      trackingCarrier: order.trackingCarrier,
      trackingCode: order.trackingCode,
      items: order.items,
    };
  },
);
