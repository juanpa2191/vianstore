import Link from "next/link";
import {
  CalendarDays,
  TrendingUp,
  Clock,
  PackageX,
  ChevronRight,
} from "lucide-react";
import {
  getLowStockCount,
  getLowStockSkus,
  getPendingBreakdown,
  getSalesThisMonth,
  getSalesToday,
} from "@/lib/dashboard/queries";
import { getLowStockThreshold } from "@/lib/dashboard/config";
import { formatCentsCOP } from "@/lib/format/money";
import { requireAdmin } from "@/lib/auth/require-admin";
import StatTile from "@/components/admin/StatTile";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export const metadata = {
  title: "Dashboard — Admin",
  robots: { index: false, follow: false },
};

// `/admin` es dinámica por `requireAdmin()` (usa cookies), así que
// `export const revalidate = ...` sería ignorado por Next 16. La página
// se recalcula en cada visita del admin — aceptable para una vista de
// resumen con volumen operativo del MVP.

// Etiquetas de los estados pendientes para el chip clickable. El tipo del
// `status` se acota a los tres estados que sí viven en `PendingOrdersBreakdown`
// para que TS pueda indexar sin cast.
const PENDING_STATES: Array<{
  status: "pendiente_pago" | "pagado" | "en_preparacion";
  label: string;
}> = [
  { status: "pendiente_pago", label: "Pendiente de pago" },
  { status: "pagado", label: "Pagados" },
  { status: "en_preparacion", label: "En preparación" },
];

export default async function AdminDashboardPage() {
  // Defensa en profundidad: el layout ya lo llama, pero si un futuro refactor
  // embebe esta página desde otro punto, el chequeo sigue vigente.
  await requireAdmin();

  const [salesToday, salesMonth, pending, lowStockCount, lowStockSkus] =
    await Promise.all([
      getSalesToday(),
      getSalesThisMonth(),
      getPendingBreakdown(),
      getLowStockCount(),
      getLowStockSkus(5),
    ]);

  const threshold = getLowStockThreshold();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900">
          Dashboard
        </h1>
        <p className="text-xs text-neutral-500">
          Resumen operativo del día. Recarga para ver el último dato.
        </p>
      </header>

      {/* KPI row — 4 stat tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Ventas de hoy"
          value={formatCentsCOP(salesToday.totalCents)}
          hint={`${salesToday.count} ${salesToday.count === 1 ? "pedido pagado" : "pedidos pagados"}`}
          icon={CalendarDays}
        />
        <StatTile
          label="Ventas del mes"
          value={formatCentsCOP(salesMonth.totalCents)}
          hint={`${salesMonth.count} ${salesMonth.count === 1 ? "pedido pagado" : "pedidos pagados"}`}
          icon={TrendingUp}
        />
        <StatTile
          label="Pedidos pendientes"
          value={String(pending.total)}
          hint={
            pending.total === 0
              ? "Todo al día"
              : `${pending.pendiente_pago} por pagar · ${pending.pagado} pagados · ${pending.en_preparacion} preparando`
          }
          icon={Clock}
          href="/admin/orders?status=pendiente_pago"
          ctaLabel="Ver pedidos"
          tone={pending.total > 0 ? "amber" : "neutral"}
        />
        <StatTile
          label="SKUs con stock bajo"
          value={String(lowStockCount)}
          hint={`Stock ≤ ${threshold} unidades — revisa la lista abajo`}
          icon={PackageX}
          tone={lowStockCount > 0 ? "red" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribución de pendientes por estado */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
              Pedidos por estado
            </h2>
          </div>
          {pending.total === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
              Sin pedidos pendientes de acción.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {PENDING_STATES.map(({ status, label }) => {
                const count = pending[status];
                return (
                  <li key={status}>
                    <Link
                      href={`/admin/orders?status=${status}`}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 transition-colors hover:border-neutral-400"
                    >
                      <div className="flex items-center gap-2.5">
                        <OrderStatusBadge status={status} />
                        <span className="text-sm text-neutral-700">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold tabular-nums text-neutral-900">
                          {count}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 text-neutral-400"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Top 5 stock bajo */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
              Stock bajo (top 5)
            </h2>
            {lowStockCount > 5 && (
              <Link
                href="/admin/products"
                className="text-[11px] font-semibold text-neutral-700 hover:text-neutral-900"
              >
                Ver todos ({lowStockCount})
              </Link>
            )}
          </div>
          {lowStockSkus.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
              Sin SKUs bajo el umbral. 🎉
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {lowStockSkus.map((s) => (
                <li key={s.skuId}>
                  <Link
                    href={`/admin/products/${s.productId}`}
                    className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2.5 transition-colors hover:border-neutral-400"
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-300"
                      style={{ backgroundColor: `#${s.colorHex}` }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-neutral-900">
                        {s.productName}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {s.colorName} · Talla {s.sizeLabel} · {s.code}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-black tabular-nums ${
                        s.stock === 0
                          ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
                          : "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200"
                      }`}
                    >
                      {s.stock}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
