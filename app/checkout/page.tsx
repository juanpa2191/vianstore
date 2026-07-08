import Link from "next/link";
import { ChevronLeft, MapPin, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { getCartView } from "@/lib/cart/queries";
import { formatCentsCOP } from "@/lib/format/money";
import { getShippingCostCents } from "@/lib/checkout/config";
import ConfirmButton from "./ConfirmButton";

export const metadata = {
  title: "Checkout — VianStore",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const session = await requireUser();

  const [cart, address] = await Promise.all([
    getCartView(),
    prisma.address.findUnique({ where: { userId: session.userId } }),
  ]);

  const shippingCents = getShippingCostCents();
  const totalCents = cart.subtotalCents + shippingCents;

  const hasUnavailable = cart.items.some((i) => i.unavailable);
  const hasStockIssue = cart.items.some((i) => !i.unavailable && i.qty > i.stock);
  const canConfirm =
    cart.items.length > 0 && address !== null && !hasUnavailable && !hasStockIssue;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver al carrito
      </Link>
      <h1 className="mt-3 font-display text-2xl font-black tracking-tight text-neutral-900">
        Confirmar pedido
      </h1>

      {cart.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center text-sm text-neutral-500">
          Tu carrito está vacío.{" "}
          <Link href="/products" className="font-semibold text-neutral-900 underline">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {/* Dirección */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                  <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                    Dirección de envío
                  </h2>
                </div>
                <Link
                  href="/account/address"
                  className="text-[11px] font-semibold text-neutral-700 underline hover:text-neutral-900"
                >
                  {address ? "Editar" : "Agregar"}
                </Link>
              </div>
              {address ? (
                <div className="text-sm text-neutral-800">
                  <p className="font-bold">{address.fullName}</p>
                  <p className="text-neutral-600">
                    {address.line1}
                    {address.line2 ? ` · ${address.line2}` : ""}
                  </p>
                  <p className="text-neutral-600">
                    {address.city}, {address.state}
                    {address.postalCode ? ` · ${address.postalCode}` : ""} ·{" "}
                    {address.country}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">Tel: {address.phone}</p>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                  Falta agregar dirección para confirmar el pedido.
                </p>
              )}
            </section>

            {/* Ítems */}
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-3 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                Ítems ({cart.totalQty})
              </h2>
              <ul className="divide-y divide-neutral-100">
                {cart.items.map((i) => (
                  <li key={i.itemId} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                        {i.brandName}
                      </p>
                      <p className="truncate text-sm font-bold text-neutral-900">
                        {i.productName}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {i.colorName} · Talla {i.sizeLabel} · {i.skuCode}
                      </p>
                      {i.unavailable && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          No disponible — retíralo del carrito.
                        </p>
                      )}
                      {!i.unavailable && i.qty > i.stock && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          Solo quedan {i.stock} en stock.
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="tabular-nums text-neutral-500">×{i.qty}</p>
                      <p className="font-mono font-bold tabular-nums text-neutral-900">
                        {formatCentsCOP(i.priceCents * i.effectiveQty)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
              Resumen
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-600">Subtotal</dt>
                <dd className="font-mono tabular-nums">
                  {formatCentsCOP(cart.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-600">Envío</dt>
                <dd className="font-mono tabular-nums">
                  {shippingCents === 0 ? "Gratis" : formatCentsCOP(shippingCents)}
                </dd>
              </div>
              <div className="mt-3 flex justify-between border-t border-neutral-100 pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums text-neutral-900">
                  {formatCentsCOP(totalCents)}
                </dd>
              </div>
            </dl>

            <ConfirmButton disabled={!canConfirm} expectedTotalCents={totalCents} />

            <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">
              El pedido queda en <strong>pendiente de pago</strong>. Te contactaremos por
              WhatsApp con el detalle de la cuenta bancaria para transferir. Al recibir el
              pago confirmamos el envío.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
