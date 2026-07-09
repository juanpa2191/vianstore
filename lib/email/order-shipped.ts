import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { AddressSnapshotSchema } from "@/lib/checkout/snapshot";
import { getCarrierInfo } from "@/lib/orders/carriers";
import OrderShipped from "@/emails/OrderShipped";
import {
  categorizeEmailError,
  firstNameFrom,
  getSiteUrlOrFail,
} from "./shared";

/**
 * Envía el email "tu pedido está en camino" tras la transición a `enviado`
 * (PR #12). Se llama POST-commit de `runTransition` desde `after()` — un
 * fallo aquí NO revierte la transición.
 *
 * Idempotencia: atomic claim con `updateMany({ where: { shippedEmailSentAt: null } })`.
 * Si falla el envío, libera el claim con categoría de error para permitir
 * retry manual (via `UPDATE order SET shipped_email_sent_at = NULL` +
 * re-invocar el helper).
 *
 * Robustez: TODO el cuerpo va en try/catch — un blip de DB en el propio
 * claim también deja huella (`shipped_email_error = "claim_failed"`) en vez
 * de desaparecer silenciosamente.
 */
export async function sendOrderShippedEmail(orderId: string): Promise<void> {
  let claimedByUs = false;
  try {
    const claimTs = new Date();
    const claim = await prisma.order.updateMany({
      where: { id: orderId, shippedEmailSentAt: null },
      data: { shippedEmailSentAt: claimTs, shippedEmailError: null },
    });
    if (claim.count === 0) return; // otro worker ya envió o está enviando.
    claimedByUs = true;
    await sendClaimed(orderId);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    console.error("[email/order-shipped] unexpected", { orderId, message });
    if (claimedByUs) {
      await releaseClaim(orderId, "unexpected_error");
    } else {
      // Falló el claim inicial — intentamos dejar rastro sin romper la promise.
      await prisma.order
        .update({ where: { id: orderId }, data: { shippedEmailError: "claim_failed" } })
        .catch(() => {});
    }
    throw err;
  }
}

async function sendClaimed(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userEmail: true,
      addressSnapshot: true,
      trackingCarrier: true,
      trackingCode: true,
    },
  });
  if (!order) return;

  // Validaciones de entrada: `markShipped` de PR #11 garantiza carrier + code
  // vía Zod, así que estos guards solo disparan en edges (backfill script,
  // edición manual, refactor futuro que rompe el schema).
  const parsedAddress = AddressSnapshotSchema.safeParse(order.addressSnapshot);
  if (!parsedAddress.success) {
    await releaseClaim(orderId, "address_snapshot_corrupt");
    return;
  }

  const siteUrl = getSiteUrlOrFail();
  if (!siteUrl) {
    await releaseClaim(orderId, "site_url_misconfigured");
    return;
  }

  const carrier = getCarrierInfo(order.trackingCarrier);
  const trackingCode = order.trackingCode?.trim() ?? "";
  // Si el carrier no está en el mapa o es "otro", el nombre no se usa en
  // subject/preview/body — la plantilla condiciona su render.
  const isGenericCarrier = !carrier || carrier.slug === "otro";
  const carrierName = isGenericCarrier ? null : carrier.name;
  const trackingUrl =
    carrier?.trackingUrl && trackingCode ? carrier.trackingUrl(trackingCode) : null;

  const orderShortId = order.id.slice(0, 8);
  const orderUrl = `${siteUrl}/account/orders/${order.id}`;

  const react = createElement(OrderShipped, {
    orderShortId,
    orderUrl,
    customerName: firstNameFrom(parsedAddress.data.fullName),
    carrierName,
    trackingCode,
    trackingUrl,
  });

  // Subject alternativo si no hay carrier reconocido — evita "está en camino
  // con Otra transportadora" que lee como placeholder al cliente.
  const subject = carrierName
    ? `Tu pedido #${orderShortId} está en camino con ${carrierName} — VianStore`
    : `Tu pedido #${orderShortId} está en camino — VianStore`;

  const result = await sendEmail({
    to: order.userEmail,
    subject,
    react,
    idempotencyKey: `shipped:${order.id}`,
  });

  if (!result.ok) {
    await releaseClaim(orderId, categorizeEmailError(result.error));
  }
}

async function releaseClaim(orderId: string, category: string): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { shippedEmailSentAt: null, shippedEmailError: category },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    console.error("[email/order-shipped] release claim failed", { orderId, message });
  }
}
