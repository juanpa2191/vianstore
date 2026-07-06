import Link from "next/link";
import Image from "next/image";
import { Plus, Search, ImageOff } from "lucide-react";
import type { ProductStatus } from "@prisma/client";
import { listAdminProducts } from "@/lib/catalog/admin-queries";
import { formatCentsRangeCOP } from "@/lib/format/money";
import StatusBadge from "./StatusBadge";

const STATUS_OPTIONS: Array<{ value: "all" | ProductStatus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "draft", label: "Borradores" },
  { value: "archived", label: "Archivados" },
];

type Search = {
  q?: string;
  status?: string;
  page?: string;
};

function parseStatus(raw: string | undefined): "all" | ProductStatus {
  if (raw === "active" || raw === "draft" || raw === "archived") return raw;
  return "all";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const status = parseStatus(sp.status);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const { rows, total, pageSize } = await listAdminProducts({ q, status, page });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900">
            Productos
          </h1>
          <p className="text-xs text-neutral-500">
            {total} {total === 1 ? "producto" : "productos"} en total.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-1.5 self-start rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-neutral-800 sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo producto
        </Link>
      </header>

      <form
        method="get"
        action="/admin/products"
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
            placeholder="Buscar por nombre o slug…"
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
              <th className="px-3 py-3">Producto</th>
              <th className="px-3 py-3">Marca</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Precio</th>
              <th className="px-3 py-3">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-neutral-500">
                  {q || status !== "all"
                    ? "No hay productos que coincidan con el filtro."
                    : "Aún no hay productos. Crea el primero."}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-neutral-50">
                <td className="px-3 py-3">
                  <Link href={`/admin/products/${row.id}`} className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                      {row.primaryImageUrl ? (
                        <Image
                          src={row.primaryImageUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <ImageOff className="h-4 w-4 text-neutral-300" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-neutral-900">
                        {row.name}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-neutral-400">
                        /{row.slug}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-neutral-600">{row.brandName}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-3 tabular-nums text-neutral-600">{row.totalStock}</td>
                <td className="px-3 py-3 tabular-nums text-neutral-600">
                  {row.priceMinCents === null || row.priceMaxCents === null
                    ? "—"
                    : formatCentsRangeCOP(row.priceMinCents, row.priceMaxCents)}
                </td>
                <td className="px-3 py-3 text-neutral-500">
                  {row.updatedAt.toLocaleDateString("es-CO", {
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
              <Link
                href={`/admin/products?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(status !== "all" ? { status } : {}),
                  page: String(page - 1),
                }).toString()}`}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 hover:border-neutral-400"
              >
                Anterior
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={`/admin/products?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(status !== "all" ? { status } : {}),
                  page: String(page + 1),
                }).toString()}`}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 hover:border-neutral-400"
              >
                Siguiente
              </Link>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}
