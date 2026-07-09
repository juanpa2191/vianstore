import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MapPin, User, AlertTriangle, ExternalLink } from "lucide-react";
import { z } from "zod";
import { getAdminOrder } from "@/lib/orders/admin-queries";
import { allowedTransitions } from "@/lib/orders/transitions";
import { getCarrierInfo, CARRIER_OPTIONS } from "@/lib/orders/carriers";
import { formatCentsCOP } from "@/lib/format/money";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import TransitionsPanel from "./TransitionsPanel";
import StatusHistory from "./StatusHistory";

export const metadata = {
  title: "Pedido — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const order = await getAdminOrder(id);
  if (!order) notFound();

  const allowed = allowedTransitions(order.status);
  const carrier = getCarrierInfo(order.trackingCarrier);
  const trackingCode = order.trackingCode?.trim() || null;
  const trackingUrl =
    carrier?.trackingUrl && trackingCode
      ? carrier.trackingUrl(trackingCode)
      : null;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver a pedidos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900">
            Pedido <span className="font-mono text-neutral-500">#{order.shortId}</span>
          </h1>
          <OrderStatusBadge status={order.status} size="md" />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Creado{" "}
          {order.createdAt.toLocaleString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Panel de transiciones */}
      <TransitionsPanel
        orderId={order.id}
        currentStatus={order.status}
        allowed={allowed}
        currentTrackingCarrier={order.trackingCarrier}
        currentTrackingCode={order.trackingCode}
        carrierOptions={CARRIER_OPTIONS.map((c) => ({ slug: c.slug, name: c.name }))}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          {/* Cliente */}
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                Cliente
              </h2>
            </div>
            <p className="text-sm">
              <a
                href={`mailto:${order.userEmail}`}
                className="font-mono text-neutral-900 hover:underline"
              >
                {order.userEmail}
              </a>
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              User ID:{" "}
              <span className="font-mono">
                {order.userId ? order.userId.slice(0, 8) + "…" : "eliminado"}
              </span>
            </p>
          </section>

          {/* Dirección */}
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                Dirección de envío
              </h2>
            </div>
            {order.address ? (
              <div className="text-sm text-neutral-800">
                <p className="font-bold">{order.address.fullName}</p>
                <p className="text-neutral-600">
                  {order.address.line1}
                  {order.address.line2 ? ` · ${order.address.line2}` : ""}
                </p>
                <p className="text-neutral-600">
                  {order.address.city}, {order.address.state}
                  {order.address.postalCode ? ` · ${order.address.postalCode}` : ""} ·{" "}
                  {order.address.country}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Tel: {order.address.phone}
                </p>
              </div>
            ) : (
              <p className="inline-flex items-start gap-1.5 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                Snapshot de dirección corrupto. Contactar cliente por correo.
              </p>
            )}
          </section>

          {/* Ítems */}
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
              Ítems
            </h2>
            <ul className="divide-y divide-neutral-100">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-neutral-900">{it.productName}</p>
                    <p className="text-[11px] text-neutral-500">
                      {it.colorName} · Talla {it.sizeLabel} · {it.skuCode}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-500 tabular-nums">
                      {formatCentsCOP(it.unitPriceCents)} c/u
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums text-neutral-500">×{it.qty}</p>
                    <p className="font-mono font-bold tabular-nums text-neutral-900">
                      {formatCentsCOP(it.subtotalCents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Historial */}
          <StatusHistory history={order.history} />
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
              Resumen
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-neutral-600">
                <dt>Subtotal</dt>
                <dd className="font-mono tabular-nums">
                  {formatCentsCOP(order.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between text-neutral-600">
                <dt>Envío</dt>
                <dd className="font-mono tabular-nums">
                  {order.shippingCents === 0
                    ? "Gratis"
                    : formatCentsCOP(order.shippingCents)}
                </dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 text-base font-bold text-neutral-900">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums">
                  {formatCentsCOP(order.totalCents)}
                </dd>
              </div>
            </dl>
          </section>

          {(order.status === "enviado" || order.status === "entregado") && (
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-3 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                Envío
              </h2>
              {order.trackingCarrier && (
                <p className="text-sm">
                  Transportadora:{" "}
                  <strong>{carrier?.name ?? "Desconocida"}</strong>
                </p>
              )}
              {trackingCode && (
                <p className="text-sm">
                  Guía: <span className="font-mono">{trackingCode}</span>
                </p>
              )}
              {order.shippedAt && (
                <p className="mt-1 text-[11px] text-neutral-500">
                  Enviado el{" "}
                  {order.shippedAt.toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {order.deliveredAt && (
                <p className="text-[11px] text-neutral-500">
                  Entregado el{" "}
                  {order.deliveredAt.toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {trackingUrl && (
                <Link
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
                >
                  Abrir en la web de la transportadora
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </section>
          )}

          {/* Email de confirmación */}
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                Email de confirmación
              </h2>
            </div>
            {order.emailSentAt && !order.emailError ? (
              <p className="text-[11px] text-emerald-700">
                Enviado el{" "}
                {order.emailSentAt.toLocaleString("es-CO", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : order.emailError ? (
              <p
                className="text-[11px] text-red-600"
                title={order.emailError}
              >
                Falló:{" "}
                <span className="font-mono">
                  {order.emailError.length > 120
                    ? `${order.emailError.slice(0, 120)}…`
                    : order.emailError}
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-neutral-500">Pendiente de envío.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
