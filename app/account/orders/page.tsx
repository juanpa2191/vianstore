import Link from "next/link";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { listMyOrders } from "@/lib/orders/queries";
import { formatCentsCOP } from "@/lib/format/money";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export const metadata = {
  title: "Mis pedidos — VianStore",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const session = await requireUser();
  const orders = await listMyOrders(session.userId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver a mi cuenta
      </Link>
      <h1 className="mt-3 font-display text-2xl font-black tracking-tight text-neutral-900">
        Mis pedidos
      </h1>
      <p className="mt-1 text-xs text-neutral-500">
        {orders.length === 0
          ? "Aún no has hecho ningún pedido."
          : `${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"} en total.`}
      </p>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-neutral-300" aria-hidden="true" />
          <p className="text-sm text-neutral-500">
            Cuando confirmes tu primer pedido aparecerá acá.{" "}
            <Link href="/products" className="font-semibold text-neutral-900 underline">
              Ver catálogo
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-neutral-900">
                      #{o.shortId}
                    </span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="text-xs text-neutral-500">
                    {o.createdAt.toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                    {" · "}
                    {o.itemCount} {o.itemCount === 1 ? "ítem" : "ítems"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold tabular-nums text-neutral-900">
                    {formatCentsCOP(o.totalCents)}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
