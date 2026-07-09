import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { AddressSnapshotSchema } from "@/lib/checkout/snapshot";
import OrderConfirmation from "@/emails/OrderConfirmation";
import { categorizeEmailError, firstNameFrom, getSiteUrlOrFail } from "./shared";

/**
 * Envía el email de confirmación para un pedido y guarda el resultado en
 * `Order.emailSentAt` / `Order.emailError`. Diseñada para llamarse DESPUÉS del
 * commit de la transacción de checkout — un fallo aquí no revierte el pedido.
 *
 * Idempotencia server-side: se hace un **claim atómico** vía `updateMany`
 * con `WHERE emailSentAt IS NULL` antes de enviar. Solo el primer thread /
 * cron pasa el claim; los demás abortan. Si el envío falla, se limpia el
 * `emailSentAt` para permitir un futuro retry (registrando el error).
 * El `idempotencyKey` a Resend es la segunda línea de defensa por si el CAS
 * se pierde de todos modos.
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  // 1. Claim atómico: solo procede si `emailSentAt IS NULL`.
  const claimTs = new Date();
  const claim = await prisma.order.updateMany({
    where: { id: orderId, emailSentAt: null },
    data: { emailSentAt: claimTs, emailError: null },
  });
  if (claim.count === 0) return; // otro worker ya se lo llevó, o ya se envió.

  // Todo lo que sigue está protegido: cualquier excepción libera el claim.
  // Sin este envoltorio, un blip de DB o un throw en render() dejaría el
  // pedido con `emailSentAt = claimTs` y `emailError = null` para siempre.
  try {
    await sendClaimedOrder(orderId);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    console.error("[email/order-confirmation] unexpected error post-claim", {
      orderId,
      message,
    });
    await releaseClaim(orderId, "unexpected_error");
    throw err;
  }
}

async function sendClaimedOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userEmail: true,
      addressSnapshot: true,
      subtotalCents: true,
      shippingCents: true,
      totalCents: true,
      items: {
        select: {
          productName: true,
          colorName: true,
          sizeLabel: true,
          skuCode: true,
          qty: true,
          subtotalCents: true,
        },
      },
    },
  });

  if (!order) {
    // Extremadamente improbable — el pedido acaba de ser claimed.
    return;
  }

  const parsed = AddressSnapshotSchema.safeParse(order.addressSnapshot);
  if (!parsed.success) {
    await releaseClaim(orderId, "address_snapshot_corrupt");
    return;
  }
  const address = parsed.data;

  const orderShortId = order.id.slice(0, 8);
  const siteUrl = getSiteUrlOrFail();
  if (!siteUrl) {
    await releaseClaim(orderId, "site_url_misconfigured");
    return;
  }
  const orderUrl = `${siteUrl}/checkout/success/${order.id}`;

  const customerName = firstNameFrom(address.fullName);

  const react = createElement(OrderConfirmation, {
    orderShortId,
    orderUrl,
    customerName,
    address,
    items: order.items,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
  });

  const result = await sendEmail({
    to: order.userEmail,
    subject: `Recibimos tu pedido #${orderShortId} — VianStore`,
    react,
    // Segunda línea de defensa: si el CAS falla y el helper corre dos veces,
    // Resend deduplica del lado del provider por 24h.
    idempotencyKey: order.id,
  });

  if (!result.ok) {
    await releaseClaim(orderId, categorizeEmailError(result.error));
  }
  // Si result.ok → el claim ya escribió emailSentAt, no hay más que hacer.
}

/**
 * Limpia el claim para permitir un retry futuro. Guarda el error como
 * categoría (evita persistir mensajes crudos del provider con PII o URLs).
 */
async function releaseClaim(orderId: string, category: string): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { emailSentAt: null, emailError: category },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    console.error("[email/order-confirmation] release claim failed", {
      orderId,
      message,
    });
  }
}

