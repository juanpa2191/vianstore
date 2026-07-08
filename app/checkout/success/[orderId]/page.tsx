import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MapPin, Package } from "lucide-react";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { formatCentsCOP } from "@/lib/format/money";
import { AddressSnapshotSchema } from "@/lib/checkout/snapshot";

export const metadata = {
  title: "Pedido confirmado — VianStore",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await requireUser();
  const { orderId } = await params;

  if (!z.string().uuid().safeParse(orderId).success) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { orderBy: { productName: "asc" } },
    },
  });
  // Unificamos "no existe" y "no es tuyo" a notFound() para no filtrar por
  // canal lateral la existencia de pedidos ajenos.
  if (!order || order.userId !== session.userId) notFound();

  // Runtime validation: si el JSON del snapshot está corrupto (restore parcial,
  // migración manual), preferimos 404 antes que renderizar "Tel: undefined".
  const parsedAddress = AddressSnapshotSchema.safeParse(order.addressSnapshot);
  if (!parsedAddress.success) {
    console.error("[checkout/success] address snapshot corrupto", {
      orderId: order.id,
      issues: parsedAddress.error.issues,
    });
    notFound();
  }
  const address = parsedAddress.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-black">¡Pedido recibido!</p>
          <p className="text-xs">
            Te contactaremos por WhatsApp con los datos para transferir. El pedido queda en{" "}
            <strong>pendiente de pago</strong> hasta que confirmemos la transferencia.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
              Pedido
            </p>
            <p className="font-mono text-sm text-neutral-800">#{order.id.slice(0, 8)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
              Fecha
            </p>
            <p className="text-sm text-neutral-800">
              {order.createdAt.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-2 border-t border-neutral-100 pt-4">
          <MapPin className="mt-0.5 h-4 w-4 text-neutral-500" aria-hidden="true" />
          <div className="text-sm text-neutral-800">
            <p className="font-bold">{address.fullName}</p>
            <p className="text-neutral-600">
              {address.line1}
              {address.line2 ? ` · ${address.line2}` : ""}
            </p>
            <p className="text-neutral-600">
              {address.city}, {address.state}
              {address.postalCode ? ` · ${address.postalCode}` : ""} · {address.country}
            </p>
            <p className="text-xs text-neutral-500">Tel: {address.phone}</p>
          </div>
        </div>

        <div className="mb-4 border-t border-neutral-100 pt-4">
          <div className="mb-2 flex items-center gap-2">
            <Package className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
              Ítems
            </h2>
          </div>
          <ul className="divide-y divide-neutral-100">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-900">
                    {it.productName}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {it.colorName} · Talla {it.sizeLabel} · {it.skuCode}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="tabular-nums text-neutral-500">×{it.qty}</p>
                  <p className="font-mono font-bold tabular-nums text-neutral-900">
                    {formatCentsCOP(it.subtotalCents)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <dl className="space-y-1.5 border-t border-neutral-100 pt-4 text-sm">
          <div className="flex justify-between text-neutral-600">
            <dt>Subtotal</dt>
            <dd className="font-mono tabular-nums">
              {formatCentsCOP(order.subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between text-neutral-600">
            <dt>Envío</dt>
            <dd className="font-mono tabular-nums">
              {order.shippingCents === 0 ? "Gratis" : formatCentsCOP(order.shippingCents)}
            </dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 text-base font-bold text-neutral-900">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">{formatCentsCOP(order.totalCents)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row">
        <Link
          href="/products"
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-center text-xs font-bold text-neutral-700 hover:border-neutral-400"
        >
          Seguir comprando
        </Link>
        <Link
          href="/account"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-center text-xs font-bold text-white hover:bg-neutral-800"
        >
          Ver mi cuenta
        </Link>
      </div>
    </div>
  );
}
