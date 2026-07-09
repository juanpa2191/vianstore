import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Package, Truck, ExternalLink, Check, AlertTriangle } from "lucide-react";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import { getMyOrder } from "@/lib/orders/queries";
import { getCarrierInfo } from "@/lib/orders/carriers";
import { formatCentsCOP } from "@/lib/format/money";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export const metadata = {
  title: "Detalle de pedido — VianStore",
  robots: { index: false, follow: false },
};

// Estados en orden cronológico para la línea de tiempo. `cancelado` no
// aparece en la línea (se muestra aparte cuando aplica).
const TIMELINE: OrderStatus[] = [
  "pendiente_pago",
  "pagado",
  "en_preparacion",
  "enviado",
  "entregado",
];

const TIMELINE_LABEL: Record<OrderStatus, string> = {
  pendiente_pago: "Pedido recibido",
  pagado: "Pago confirmado",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) notFound();

  const order = await getMyOrder(session.userId, id);
  if (!order) notFound();

  // El snapshot de dirección puede ser null si el JSON está corrupto (edge:
  // restore parcial, migración manual). Renderizamos "dirección no disponible"
  // en vez de romper toda la ruta — el resto del pedido sigue siendo válido.
  const address = order.address;

  const carrier = getCarrierInfo(order.trackingCarrier);
  const trackingCode = order.trackingCode?.trim() || null; // rechaza "" y "  "
  const trackingUrl =
    order.status === "enviado" && carrier?.trackingUrl && trackingCode
      ? carrier.trackingUrl(trackingCode)
      : null;

  const currentIdx = TIMELINE.indexOf(order.status);
  const isCancelled = order.status === "cancelado";
  // Guard: si aparece un OrderStatus no listado (drift futuro del enum),
  // renderizamos un mensaje explícito en vez de opacar todo el timeline.
  const isUnknownStatus = !isCancelled && currentIdx === -1;
  if (isUnknownStatus) {
    console.warn("[orders/detail] status fuera de TIMELINE", {
      orderId: order.id,
      status: order.status,
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Mis pedidos
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900">
            Pedido{" "}
            <span className="font-mono text-neutral-500">#{order.shortId}</span>
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Creado el{" "}
            {order.createdAt.toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} size="md" />
      </div>

      {/* Línea de tiempo */}
      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
          Progreso
        </h2>
        {isCancelled ? (
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
            Este pedido fue cancelado. Si tienes dudas, escríbenos por Instagram{" "}
            <Link
              href="https://www.instagram.com/vianstore14"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-700 underline"
            >
              @vianstore14
            </Link>
            .
          </p>
        ) : isUnknownStatus ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            El estado de este pedido está en revisión. Escríbenos por Instagram{" "}
            <Link
              href="https://www.instagram.com/vianstore14"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              @vianstore14
            </Link>{" "}
            y te contamos.
          </p>
        ) : (
          <ol className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            {TIMELINE.map((step, i) => {
              const isDone = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <li
                  key={step}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex flex-1 items-start gap-2 sm:flex-col sm:items-center sm:text-center ${
                    isDone ? "" : "opacity-40"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                      isDone
                        ? isCurrent
                          ? "bg-neutral-900 text-white ring-2 ring-neutral-900 ring-offset-2"
                          : "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      isDone ? "text-neutral-800" : "text-neutral-500"
                    }`}
                  >
                    {TIMELINE_LABEL[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Tracking: aparece si el pedido está enviado. Muestra guía si existe;
          si no, un aviso "guía próximamente" para no dejar al cliente sin
          contexto. Si el carrier persistido no está en el mapa (drift futuro),
          fallback textual "Transportadora desconocida". */}
      {order.status === "enviado" && (
        <section className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-display text-xs font-black tracking-widest text-indigo-700 uppercase">
                Envío en camino
              </h2>
              {order.trackingCarrier && (
                <p className="mt-1 text-sm text-neutral-800">
                  Transportadora:{" "}
                  <strong>{carrier?.name ?? "Transportadora desconocida"}</strong>
                </p>
              )}
              {trackingCode ? (
                <>
                  <p className="text-sm text-neutral-800">
                    Guía: <span className="font-mono">{trackingCode}</span>
                  </p>
                  {trackingUrl && (
                    <Link
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
                    >
                      Rastrear en la web de la transportadora
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-neutral-700">
                  Guía próximamente. Te notificaremos por correo cuando esté disponible.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Ítems */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
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
                  <p className="mt-1 text-[11px] text-neutral-500 tabular-nums">
                    {formatCentsCOP(it.unitPriceCents)} c/u
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
        </section>

        {/* Dirección + totales */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                Envío a
              </h2>
            </div>
            {address ? (
              <>
                <p className="text-sm font-bold text-neutral-900">{address.fullName}</p>
                <p className="text-xs text-neutral-600">
                  {address.line1}
                  {address.line2 ? ` · ${address.line2}` : ""}
                </p>
                <p className="text-xs text-neutral-600">
                  {address.city}, {address.state}
                  {address.postalCode ? ` · ${address.postalCode}` : ""} ·{" "}
                  {address.country}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">Tel: {address.phone}</p>
              </>
            ) : (
              <p className="inline-flex items-start gap-1.5 text-xs text-amber-800">
                <AlertTriangle
                  className="mt-0.5 h-3 w-3 shrink-0"
                  aria-hidden="true"
                />
                Dirección no disponible. Escríbenos para confirmar los datos de
                envío.
              </p>
            )}
          </section>

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
        </aside>
      </div>
    </div>
  );
}
