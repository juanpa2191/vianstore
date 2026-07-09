"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canTransition } from "@/lib/orders/transitions";
import { getCarrierInfo } from "@/lib/orders/carriers";
import { sendOrderShippedEmail } from "@/lib/email/order-shipped";
import {
  deliveryEmailsEnabled,
  sendOrderDeliveredEmail,
} from "@/lib/email/order-delivered";

export type OrderActionResult =
  | { ok: true }
  | { ok: false; formError: string; fieldErrors?: Record<string, string> };

class TransitionNotAllowedError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`No se puede pasar de ${from} a ${to}`);
  }
}

class OrderNotFoundError extends Error {
  constructor() {
    super("Pedido no encontrado");
  }
}

const shipSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().min(1, "Selecciona una transportadora"),
  code: z
    .string()
    .trim()
    .min(1, "Ingresa el número de guía")
    .max(80, "Máximo 80 caracteres")
    // Guías reales de Servientrega/Coordinadora pueden incluir `/ # + espacios`.
    // Bloqueamos solo caracteres de control con este allowlist amplio.
    .regex(/^[A-Za-z0-9._\-/#+ ]+$/, "Caracteres no permitidos"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const noteOnlySchema = z.object({
  orderId: z.string().uuid(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

/**
 * Ejecuta una transición de estado en una transacción atómica:
 *   1. Bloquea la fila del pedido (SELECT ... FOR UPDATE).
 *   2. Verifica que la transición desde `current → to` es válida.
 *   3. UPDATE order.status + campos derivados (shipped_at, delivered_at, tracking).
 *   4. INSERT order_status_change (historial).
 *   5. Si repone stock (cancelado), UPDATE sku.stock += qty por cada order item.
 *
 * Idempotencia:
 *   - Transición: `canTransition(current, to)` bloquea repeticiones.
 *   - Reposición de stock: `Order.stockRestoredAt` es la marca canónica; solo
 *     se repone si es null. Inmune a evoluciones futuras de la state machine
 *     (ej: si un día `cancelado → pendiente_pago` se habilitara, un segundo
 *     `cancelar` no dobla el stock).
 */
async function runTransition(
  orderId: string,
  to: OrderStatus,
  session: { userId: string; email: string },
  extra: {
    note?: string;
    trackingCarrier?: string;
    trackingCode?: string;
  } = {},
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // Lock del pedido para evitar dos admins moviéndolo en paralelo.
      await tx.$queryRaw`SELECT id FROM public.order WHERE id = ${orderId}::uuid FOR UPDATE`;

      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          status: true,
          stockRestoredAt: true,
          items: { select: { skuId: true, qty: true } },
        },
      });
      if (!order) throw new OrderNotFoundError();

      if (!canTransition(order.status, to)) {
        throw new TransitionNotAllowedError(order.status, to);
      }

      const updates: Prisma.OrderUpdateInput = { status: to };
      if (to === "enviado") {
        updates.trackingCarrier = extra.trackingCarrier ?? null;
        updates.trackingCode = extra.trackingCode ?? null;
        updates.shippedAt = new Date();
      }
      if (to === "entregado") {
        updates.deliveredAt = new Date();
      }

      // Reposición de stock: solo si aún no se hizo. `stockRestoredAt` es la
      // marca canónica — inmune a evoluciones futuras de la state machine
      // (ej: reabrir un cancelado). El comment antiguo apostaba a que
      // `cancelado` era terminal; esto es una garantía explícita.
      const shouldRestoreStock =
        to === "cancelado" && order.stockRestoredAt === null;
      if (shouldRestoreStock) {
        updates.stockRestoredAt = new Date();
      }

      await tx.order.update({ where: { id: orderId }, data: updates });

      await tx.orderStatusChange.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: to,
          changedByUserId: session.userId,
          changedByEmail: session.email,
          note: extra.note || null,
        },
      });

      if (shouldRestoreStock) {
        for (const item of order.items) {
          await tx.sku.update({
            where: { id: item.skuId },
            data: { stock: { increment: item.qty } },
          });
        }
      }
    },
    { timeout: 15_000, isolationLevel: "ReadCommitted" },
  );

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");

  // Emails POST-commit (PR #12). `after()` de Next 16 usa `waitUntil` — la
  // promise sobrevive al redirect/response en Vercel serverless. Un fallo
  // aquí NO revierte la transición: cada helper hace atomic claim y libera
  // con categoría de error si falla.
  if (to === "enviado") {
    after(() =>
      sendOrderShippedEmail(orderId).catch((err) => {
        console.error("[admin/orders] shipped email failed", { orderId, err });
      }),
    );
  } else if (to === "entregado" && deliveryEmailsEnabled()) {
    after(() =>
      sendOrderDeliveredEmail(orderId).catch((err) => {
        console.error("[admin/orders] delivered email failed", { orderId, err });
      }),
    );
  }
}

function toResult(err: unknown): OrderActionResult {
  if (err instanceof OrderNotFoundError) {
    return { ok: false, formError: err.message };
  }
  if (err instanceof TransitionNotAllowedError) {
    return { ok: false, formError: err.message };
  }
  // Error inesperado (DB, red, framework). Log server-side, respuesta
  // controlada al cliente — nunca re-lanzar hacia el UI del admin.
  console.error("[admin/orders/actions] unexpected", { err });
  return { ok: false, formError: "Error inesperado. Reintenta." };
}

export async function markPaid(input: unknown): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const parsed = noteOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Datos inválidos" };
  try {
    await runTransition(parsed.data.orderId, "pagado", session, { note: parsed.data.note });
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function markInPreparation(input: unknown): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const parsed = noteOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Datos inválidos" };
  try {
    await runTransition(parsed.data.orderId, "en_preparacion", session, {
      note: parsed.data.note,
    });
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function markShipped(input: unknown): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const parsed = shipSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !(path in fieldErrors)) {
        fieldErrors[path] = issue.message;
      }
    }
    return { ok: false, formError: "Revisa los campos", fieldErrors };
  }
  // Carrier debe estar en el mapa conocido o ser "otro".
  if (!getCarrierInfo(parsed.data.carrier)) {
    return {
      ok: false,
      formError: "Transportadora no reconocida",
      fieldErrors: { carrier: "Selecciona una de la lista" },
    };
  }
  try {
    await runTransition(parsed.data.orderId, "enviado", session, {
      trackingCarrier: parsed.data.carrier,
      trackingCode: parsed.data.code,
      note: parsed.data.note,
    });
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function markDelivered(input: unknown): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const parsed = noteOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Datos inválidos" };
  try {
    await runTransition(parsed.data.orderId, "entregado", session, {
      note: parsed.data.note,
    });
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function cancelOrder(input: unknown): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const parsed = noteOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Datos inválidos" };
  try {
    await runTransition(parsed.data.orderId, "cancelado", session, {
      note: parsed.data.note,
    });
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}
