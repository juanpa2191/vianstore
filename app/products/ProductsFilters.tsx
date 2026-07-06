"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import type { FilterFacets } from "@/lib/catalog/public-queries";

type ActiveFilters = {
  q: string;
  size: string;
  color: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  sort: "newest" | "price_asc" | "price_desc";
};

const SORT_LABEL: Record<ActiveFilters["sort"], string> = {
  newest: "Más recientes",
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
};

/**
 * Sidebar de filtros del listado /products.
 *
 * Empuja los filtros a la URL (source of truth) — el server re-renderiza el
 * grid con la query correspondiente. `useTransition` mantiene la UI responsive
 * mientras Next hace fetch server-side.
 */
export default function ProductsFilters({
  facets,
  active,
}: {
  facets: FilterFacets;
  active: ActiveFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Estado controlado del input de búsqueda para poder auto-submit con debounce
  // sin perder cada tecla. Sincronización con `active.q` (source of truth desde
  // la URL) via el patrón oficial "adjust state during render" de React 19:
  // comparar el último prop conocido con el actual y setear ambos si cambió.
  // Evita `useEffect` + `setState` que la regla `set-state-in-effect` prohíbe.
  const [qLocal, setQLocal] = useState(active.q);
  const [lastActiveQ, setLastActiveQ] = useState(active.q);
  if (active.q !== lastActiveQ) {
    setLastActiveQ(active.q);
    setQLocal(active.q);
  }
  const qDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpia el timeout pendiente al desmontar para no llamar `push` sobre un
  // componente desmontado (navegación durante el debounce).
  useEffect(() => {
    return () => {
      if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    };
  }, []);

  const push = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    // Cambiar cualquier filtro resetea la paginación al primer resultado.
    params.delete("page");
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  };

  const submitQ = (value: string) => {
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    push("q", value.trim() === "" ? null : value.trim());
  };

  const scheduleQSubmit = (value: string) => {
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    qDebounceRef.current = setTimeout(() => submitQ(value), 350);
  };

  const clearAll = () => {
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    setQLocal("");
    startTransition(() => {
      router.push("/products");
    });
  };

  const anyActive =
    active.q || active.size || active.color || active.brand || active.minPrice || active.maxPrice;

  const priceHint =
    facets.priceRangeCents.max > 0
      ? `entre ${Math.round(facets.priceRangeCents.min / 100).toLocaleString("es-CO")} y ${Math.round(
          facets.priceRangeCents.max / 100,
        ).toLocaleString("es-CO")}`
      : null;

  return (
    <aside
      className={`flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-4 ${
        isPending ? "opacity-70" : ""
      }`}
      aria-busy={isPending}
    >
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          value={qLocal}
          onChange={(e) => {
            setQLocal(e.target.value);
            scheduleQSubmit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitQ(qLocal);
            }
          }}
          placeholder="Buscar…"
          aria-label="Buscar productos"
          className="w-full rounded-lg border border-neutral-200 py-2 pr-8 pl-9 text-sm focus:border-neutral-400 focus:outline-none"
        />
        {qLocal && (
          <button
            type="button"
            onClick={() => {
              setQLocal("");
              submitQ("");
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 rounded p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <FilterBlock title="Ordenar">
        <select
          value={active.sort}
          onChange={(e) => push("sort", e.target.value === "newest" ? null : e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
        >
          {(Object.keys(SORT_LABEL) as ActiveFilters["sort"][]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </select>
      </FilterBlock>

      {facets.brands.length > 0 && (
        <FilterBlock title="Marca">
          <ul className="flex flex-col gap-1">
            {facets.brands.map((b) => {
              const isActive = active.brand === b.id;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => push("brand", isActive ? null : b.id)}
                    aria-pressed={isActive}
                    className={`w-full rounded px-2 py-1 text-left text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {b.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </FilterBlock>
      )}

      {facets.sizes.length > 0 && (
        <FilterBlock title="Talla">
          <div className="flex flex-wrap gap-1.5">
            {facets.sizes.map((s) => {
              const isActive = active.size === s.label;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => push("size", isActive ? null : s.label)}
                  aria-pressed={isActive}
                  className={`min-w-9 rounded border px-2 py-1 text-xs font-bold transition-colors ${
                    isActive
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </FilterBlock>
      )}

      {facets.colors.length > 0 && (
        <FilterBlock title="Color">
          <div className="flex flex-wrap gap-1.5">
            {facets.colors.map((c) => {
              const isActive = active.color === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => push("color", isActive ? null : c.id)}
                  aria-label={c.name}
                  aria-pressed={isActive}
                  title={c.name}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-neutral-300"
                    style={{ backgroundColor: `#${c.hex}` }}
                    aria-hidden="true"
                  />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </FilterBlock>
      )}

      <FilterBlock title="Precio (COP)" hint={priceHint ?? undefined}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const min = (fd.get("minPrice") as string) ?? "";
            const max = (fd.get("maxPrice") as string) ?? "";
            const params = new URLSearchParams(searchParams);
            params.delete("page");
            if (min) params.set("minPrice", min);
            else params.delete("minPrice");
            if (max) params.set("maxPrice", max);
            else params.delete("maxPrice");
            startTransition(() => router.push(`/products?${params.toString()}`));
          }}
          className="flex flex-col gap-2"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={10000}
              name="minPrice"
              defaultValue={active.minPrice}
              placeholder="mín"
              className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs tabular-nums focus:border-neutral-400 focus:outline-none"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={10000}
              name="maxPrice"
              defaultValue={active.maxPrice}
              placeholder="máx"
              className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs tabular-nums focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
          >
            Aplicar
          </button>
        </form>
      </FilterBlock>

      {anyActive && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-neutral-400"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Limpiar filtros
        </button>
      )}
    </aside>
  );
}

function FilterBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-black tracking-widest text-neutral-500 uppercase">
        {title}
      </h3>
      {children}
      {hint && <p className="mt-1 text-[10px] text-neutral-400">{hint}</p>}
    </div>
  );
}
