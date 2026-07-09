import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { AddressSnapshotSchema } from "@/lib/checkout/snapshot";
import OrderDelivered from "@/emails/OrderDelivered";
import {
  categorizeEmailError,
  firstNameFrom,
  getSiteUrlOrFail,
} from "./shared";

/**
 * Envía el email de agradecimiento tras la entrega (PR #12). Opcional:
 * `ENABLE_DELIVERY_EMAIL=1` en env activa el disparo. Sin el toggle, la
 * transición a `entregado` no envía correo.
 */
export function deliveryEmailsEnabled(): boolean {
  return process.env.ENABLE_DELIVERY_EMAIL === "1";
}

export async function sendOrderDeliveredEmail(orderId: string): Promise<void> {
  if (!deliveryEmailsEnabled()) return;

  let claimedByUs = false;
  try {
    const claimTs = new Date();
    const claim = await prisma.order.updateMany({
      where: { id: orderId, deliveredEmailSentAt: null },
      data: { deliveredEmailSentAt: claimTs, deliveredEmailError: null },
    });
    if (claim.count === 0) return;
    claimedByUs = true;
    await sendClaimed(orderId);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    console.error("[email/order-delivered] unexpected", { orderId, message });
    if (claimedByUs) {
      await releaseClaim(orderId, "unexpected_error");
    } else {
      await prisma.order
        .update({ where: { id: orderId }, data: { deliveredEmailError: "claim_failed" } })
        .catch(() => {});
    }
    throw err;
  }
}

async function sendClaimed(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userEmail: true, addressSnapshot: true },
  });
  if (!order) return;

  const parsed = AddressSnapshotSchema.safeParse(order.addressSnapshot);
  if (!parsed.success) {
    await releaseClaim(orderId, "address_snapshot_corrupt");
    return;
  }

  const siteUrl = getSiteUrlOrFail();
  if (!siteUrl) {
    await releaseClaim(orderId, "site_url_misconfigured");
    return;
  }

  const orderShortId = order.id.slice(0, 8);
  const catalogUrl = `${siteUrl}/products`;

  const react = createElement(OrderDelivered, {
    orderShortId,
    catalogUrl,
    customerName: firstNameFrom(parsed.data.fullName),
  });

  const result = await sendEmail({
    to: order.userEmail,
    subject: `¡Gracias por tu compra #${orderShortId}! — VianStore`,
    react,
    idempotencyKey: `delivered:${order.id}`,
  });

  if (!result.ok) {
    await releaseClaim(orderId, categorizeEmailError(result.error));
  }
}

async function releaseClaim(orderId: string, category: string): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveredEmailSentAt: null, deliveredEmailError: category },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    console.error("[email/order-delivered] release claim failed", { orderId, message });
  }
}
