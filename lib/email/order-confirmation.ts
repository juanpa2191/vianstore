import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { AddressSnapshotSchema } from "@/lib/checkout/snapshot";
import { getSiteUrl } from "@/lib/env";
import OrderConfirmation from "@/emails/OrderConfirmation";

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
    console.error("[email/order-confirmation] unexpected error post-claim", {
      orderId,
      err: err instanceof Error ? err.message : String(err),
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
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && /^https?:\/\/(localhost|127\.)/i.test(siteUrl)) {
    // Prod sin NEXT_PUBLIC_SITE_URL → el link cae a localhost. Fallo ruidoso.
    await releaseClaim(orderId, "site_url_misconfigured");
    return;
  }
  const orderUrl = `${siteUrl}/checkout/success/${order.id}`;

  const customerName =
    address.fullName.trim().split(/\s+/)[0] || "cliente";

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
    await releaseClaim(orderId, categorizeError(result.error));
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
    console.error("[email/order-confirmation] release claim failed", {
      orderId,
      err,
    });
  }
}

/**
 * Normaliza el mensaje del provider a un slug corto. Nunca persistir el
 * mensaje crudo (puede tener URLs, tokens parciales, snippets del email).
 */
function categorizeError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("invalid_from")) return "resend:invalid_from";
  if (s.includes("validation_error")) return "resend:validation_error";
  if (s.includes("rate")) return "resend:rate_limited";
  if (s.includes("timeout") || s.includes("etimedout")) return "network:timeout";
  if (s.includes("email_provider_not_configured")) return "env:not_configured";
  return "provider_error";
}
