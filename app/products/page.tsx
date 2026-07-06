import Link from "next/link";
import { getFilterFacets, listPublicProducts, type PublicListSort } from "@/lib/catalog/public-queries";
import ProductCard from "@/components/catalog/ProductCard";
import ProductsFilters from "./ProductsFilters";

export const metadata = {
  title: "Catálogo — VianStore",
  description: "Sneakers originales y calzado urbano premium. Encuentra tu talla y color.",
};

type Search = {
  q?: string;
  size?: string;
  color?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
};

function parseSort(raw: string | undefined): PublicListSort {
  return raw === "price_asc" || raw === "price_desc" || raw === "newest" ? raw : "newest";
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const sort = parseSort(sp.sort);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  // Los inputs de precio están en COP (unidad); persisten como cents en la DB.
  const minPriceCop = parseNumber(sp.minPrice);
  const maxPriceCop = parseNumber(sp.maxPrice);

  const [facets, result] = await Promise.all([
    getFilterFacets(),
    listPublicProducts({
      q: q || undefined,
      sizeLabel: sp.size,
      colorId: sp.color,
      brandId: sp.brand,
      minPriceCents: minPriceCop != null ? minPriceCop * 100 : undefined,
      maxPriceCents: maxPriceCop != null ? maxPriceCop * 100 : undefined,
      sort,
      page,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  const activeFilters = {
    q,
    size: sp.size ?? "",
    color: sp.color ?? "",
    brand: sp.brand ?? "",
    minPrice: sp.minPrice ?? "",
    maxPrice: sp.maxPrice ?? "",
    sort,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900">
            Catálogo
          </h1>
          <p className="text-xs text-neutral-500">
            {result.total} {result.total === 1 ? "producto" : "productos"} disponibles.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        <ProductsFilters facets={facets} active={activeFilters} />

        <div className="min-w-0">
          {result.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center text-sm text-neutral-500">
              No hay productos que coincidan con los filtros. Ajusta y vuelve a intentar.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {result.rows.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          )}

          {pageCount > 1 && (
            <nav className="mt-6 flex items-center justify-between text-xs text-neutral-500">
              <span>
                Página {page} de {pageCount}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <PageLink
                    active={activeFilters}
                    page={page - 1}
                    label="Anterior"
                  />
                )}
                {page < pageCount && (
                  <PageLink active={activeFilters} page={page + 1} label="Siguiente" />
                )}
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({
  active,
  page,
  label,
}: {
  active: {
    q: string;
    size: string;
    color: string;
    brand: string;
    minPrice: string;
    maxPrice: string;
    sort: PublicListSort;
  };
  page: number;
  label: string;
}) {
  const params = new URLSearchParams();
  if (active.q) params.set("q", active.q);
  if (active.size) params.set("size", active.size);
  if (active.color) params.set("color", active.color);
  if (active.brand) params.set("brand", active.brand);
  if (active.minPrice) params.set("minPrice", active.minPrice);
  if (active.maxPrice) params.set("maxPrice", active.maxPrice);
  if (active.sort !== "newest") params.set("sort", active.sort);
  params.set("page", String(page));
  return (
    <Link
      href={`/products?${params.toString()}`}
      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 hover:border-neutral-400"
    >
      {label}
    </Link>
  );
}
