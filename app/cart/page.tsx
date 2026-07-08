import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { getCartView } from "@/lib/cart/queries";
import { formatCentsCOP } from "@/lib/format/money";
import CartItems from "./CartItems";

export const metadata = {
  title: "Carrito — VianStore",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const cart = await getCartView();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver al catálogo
      </Link>

      <h1 className="mt-3 font-display text-2xl font-black tracking-tight text-neutral-900">
        Tu carrito
      </h1>
      <p className="mt-1 text-xs text-neutral-500">
        {cart.totalQty === 0
          ? "Sin ítems por ahora."
          : `${cart.totalQty} ${cart.totalQty === 1 ? "ítem" : "ítems"} listos.`}
      </p>

      {cart.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-neutral-300" aria-hidden="true" />
          <p className="text-sm text-neutral-500">
            Tu carrito está vacío.{" "}
            <Link href="/products" className="font-semibold text-neutral-900 underline">
              Ver catálogo
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <CartItems items={cart.items} />

          <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
              Resumen
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-600">Subtotal</dt>
                <dd className="font-mono tabular-nums">{formatCentsCOP(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between text-xs text-neutral-500">
                <dt>Envío</dt>
                <dd>calculado en checkout</dd>
              </div>
              <div className="mt-3 flex justify-between border-t border-neutral-100 pt-3 text-base font-bold">
                <dt>Total estimado</dt>
                <dd className="font-mono tabular-nums text-neutral-900">
                  {formatCentsCOP(cart.subtotalCents)}
                </dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-black tracking-widest text-white uppercase shadow-sm hover:bg-neutral-800"
            >
              Ir a checkout
            </Link>
            <p className="mt-2 text-[10px] text-neutral-400">
              Necesitas iniciar sesión y tener una dirección para confirmar.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
