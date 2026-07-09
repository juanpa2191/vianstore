import Link from "next/link";
import { Search } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { listAdminOrders } from "@/lib/orders/admin-queries";
import { formatCentsCOP } from "@/lib/format/money";
import OrderStatusBadge from "@/components/OrderStatusBadge";

const STATUS_OPTIONS: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pendiente_pago", label: "Pendiente de pago" },
  { value: "pagado", label: "Pagado" },
  { value: "en_preparacion", label: "En preparación" },
  { value: "enviado", label: "Enviado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
};

function parseStatus(raw: string | undefined): "all" | OrderStatus {
  const valid: OrderStatus[] = [
    "pendiente_pago",
    "pagado",
    "en_preparacion",
    "enviado",
    "entregado",
    "cancelado",
  ];
  if (raw && (valid as string[]).includes(raw)) return raw as OrderStatus;
  return "all";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const status = parseStatus(sp.status);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const { rows, total, pageSize } = await listAdminOrders({ q, status, page });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900">
          Pedidos
        </h1>
        <p className="text-xs text-neutral-500">
          {total} {total === 1 ? "pedido" : "pedidos"} en total.
        </p>
      </header>

      <form
        method="get"
        action="/admin/orders"
        className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center"
      >
        <label className="relative flex flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por #número o email…"
            className="w-full rounded-lg border border-neutral-200 py-2 pr-3 pl-9 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </label>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-neutral-800"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-[10px] font-black tracking-widest text-neutral-500 uppercase">
            <tr>
              <th className="px-3 py-3">Pedido</th>
              <th className="px-3 py-3">Cliente</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-12 text-center text-sm text-neutral-500"
                >
                  {q || status !== "all"
                    ? "Sin pedidos que coincidan."
                    : "Aún no hay pedidos."}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-neutral-50">
                <td className="px-3 py-3">
                  <Link
                    href={`/admin/orders/${row.id}`}
                    className="font-mono font-bold text-neutral-900 hover:underline"
                  >
                    #{row.shortId}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-neutral-900">
                      {row.customerName ?? "—"}
                    </p>
                    <p className="truncate font-mono text-[11px] text-neutral-500">
                      {row.userEmail}
                    </p>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <OrderStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-3 font-mono tabular-nums text-neutral-900">
                  {formatCentsCOP(row.totalCents)}
                </td>
                <td className="px-3 py-3 text-neutral-500">
                  {row.createdAt.toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="flex items-center justify-between text-xs text-neutral-500">
          <span>
            Página {page} de {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <PageLink q={q} status={status} page={page - 1} label="Anterior" />
            )}
            {page < pageCount && (
              <PageLink q={q} status={status} page={page + 1} label="Siguiente" />
            )}
          </div>
        </nav>
      )}
    </section>
  );
}

function PageLink({
  q,
  status,
  page,
  label,
}: {
  q: string;
  status: "all" | OrderStatus;
  page: number;
  label: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  params.set("page", String(page));
  return (
    <Link
      href={`/admin/orders?${params.toString()}`}
      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 hover:border-neutral-400"
    >
      {label}
    </Link>
  );
}
