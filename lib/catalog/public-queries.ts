import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Envolvemos las queries públicas con React `cache()` para deduplicar dentro
// del mismo request. `getPublicProduct` en particular se llama dos veces por
// PDP (una en generateMetadata, otra en la page) — sin cache serían dos hits
// idénticos al pooler.

/**
 * Query pública del PDP (product detail page).
 *
 * Se restringe explícitamente a `status='active'` porque Prisma corre con el
 * rol `postgres` del pooler y bypasea las policies RLS. Esta es la única capa
 * que impide que un producto en `draft` o `archived` se sirva al público.
 *
 * Devuelve null si no existe (o no está activo) para que la ruta llame a
 * `notFound()` y renderice el 404.
 */
export type PublicVariantColor = {
  colorId: string;
  colorName: string;
  colorHex: string;
  sizes: Array<{ label: string; skuCode: string; priceCents: number; stock: number }>;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brandName: string;
  images: Array<{ id: string; url: string; colorName: string | null }>;
  colors: PublicVariantColor[];
  priceMinCents: number;
  priceMaxCents: number;
};

export const getPublicProduct = cache(_getPublicProduct);

async function _getPublicProduct(slug: string): Promise<PublicProduct | null> {
  const product = await prisma.product.findFirst({
    where: { slug, status: "active" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      brand: { select: { name: true } },
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          url: true,
          color: { select: { name: true } },
        },
      },
      variants: {
        orderBy: [{ color: { name: "asc" } }, { size: { sortOrder: "asc" } }],
        select: {
          color: { select: { id: true, name: true, hex: true } },
          size: { select: { label: true } },
          sku: { select: { code: true, price: true, stock: true } },
        },
      },
    },
  });

  if (!product) return null;

  // Agrupa variantes por color, descartando las que no tienen SKU (edge case
  // de datos incompletos — no debería pasar en producción pero es defensivo).
  const byColor = new Map<string, PublicVariantColor>();
  const prices: number[] = [];
  for (const v of product.variants) {
    if (!v.sku) continue;
    prices.push(v.sku.price);
    const bucket = byColor.get(v.color.id) ?? {
      colorId: v.color.id,
      colorName: v.color.name,
      colorHex: v.color.hex,
      sizes: [],
    };
    bucket.sizes.push({
      label: v.size.label,
      skuCode: v.sku.code,
      priceCents: v.sku.price,
      stock: v.sku.stock,
    });
    byColor.set(v.color.id, bucket);
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    brandName: product.brand.name,
    images: product.images.map((i) => ({
      id: i.id,
      url: i.url,
      colorName: i.color?.name ?? null,
    })),
    colors: Array.from(byColor.values()),
    priceMinCents: prices.length ? Math.min(...prices) : 0,
    priceMaxCents: prices.length ? Math.max(...prices) : 0,
  };
}

// ---------------------------------------------------------------------------
// Listado y home
// ---------------------------------------------------------------------------

export type PublicProductCard = {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  priceMinCents: number;
  priceMaxCents: number;
  primaryImageUrl: string | null;
  totalStock: number;
};

export type PublicListSort = "newest" | "price_asc" | "price_desc";

export type PublicListFilters = {
  q?: string;
  sizeLabel?: string;
  colorId?: string;
  brandId?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: PublicListSort;
  page?: number;
  pageSize?: number;
};

export type PublicListResult = {
  rows: PublicProductCard[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 12;

// Hard-limit para el sort por precio en memoria. Con el catálogo actual
// (decenas), es holgado. Al superarlo, cortamos y logueamos: senal para
// migrar el sort a SQL agregado (MIN(sku.price) OVER product) antes de que
// escale el catálogo.
const PRICE_SORT_HARD_LIMIT: number = 500;

/**
 * Query pública para el listado.
 *
 * Prisma bypasea RLS via el rol postgres, así que este código es la única
 * capa que filtra `status='active'`. Los filtros de variante (talla/color) y
 * de precio se aplican como EXISTS anidados sobre `variants.sku`.
 *
 * Ordenamiento por precio se resuelve a nivel Prisma con el min de sku.price
 * agregado en memoria — para catálogos pequeños es más simple que un raw
 * query. Con >5000 productos habría que mover a SQL agregado por eficiencia.
 */
export async function listPublicProducts(
  filters: PublicListFilters = {},
): Promise<PublicListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = filters.q?.trim();

  const skuConditions: Prisma.SkuWhereInput[] = [];
  if (filters.minPriceCents != null) {
    skuConditions.push({ price: { gte: filters.minPriceCents } });
  }
  if (filters.maxPriceCents != null) {
    skuConditions.push({ price: { lte: filters.maxPriceCents } });
  }

  const variantConditions: Prisma.VariantWhereInput[] = [];
  if (filters.sizeLabel) variantConditions.push({ size: { label: filters.sizeLabel } });
  if (filters.colorId) variantConditions.push({ colorId: filters.colorId });
  if (skuConditions.length > 0) {
    variantConditions.push({ sku: { is: { AND: skuConditions } } });
  }

  const where: Prisma.ProductWhereInput = {
    status: "active",
    ...(filters.brandId ? { brandId: filters.brandId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(variantConditions.length > 0
      ? { variants: { some: { AND: variantConditions } } }
      : {}),
  };

  const isPriceSort = filters.sort === "price_asc" || filters.sort === "price_desc";

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      // Ordenamos por updatedAt siempre en la query; si el sort pedido es por
      // precio, reordenamos en memoria abajo. Cabe para MVP.
      orderBy: [{ updatedAt: "desc" }],
      // Para newest: paginación en DB. Para price sort: traemos hasta el
      // hard-limit y paginamos en memoria (con warning si saturamos).
      ...(isPriceSort
        ? { take: PRICE_SORT_HARD_LIMIT }
        : { skip: (page - 1) * pageSize, take: pageSize }),
      select: {
        id: true,
        slug: true,
        name: true,
        brand: { select: { name: true } },
        variants: { select: { sku: { select: { price: true, stock: true } } } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
  ]);

  if (isPriceSort && products.length === PRICE_SORT_HARD_LIMIT) {
    console.warn(
      `[listPublicProducts] price sort saturó hard-limit (${PRICE_SORT_HARD_LIMIT}). ` +
        "Migrar a sort por precio en SQL antes de crecer el catálogo.",
    );
  }

  const mapped: PublicProductCard[] = products.map((p) => {
    const skus = p.variants.map((v) => v.sku).filter((s) => s !== null);
    const prices = skus.map((s) => s.price);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brandName: p.brand.name,
      priceMinCents: prices.length ? Math.min(...prices) : 0,
      priceMaxCents: prices.length ? Math.max(...prices) : 0,
      primaryImageUrl: p.images[0]?.url ?? null,
      totalStock: skus.reduce((acc, s) => acc + s.stock, 0),
    };
  });

  let rows = mapped;
  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    rows = [...mapped].sort((a, b) =>
      filters.sort === "price_asc"
        ? a.priceMinCents - b.priceMinCents
        : b.priceMinCents - a.priceMinCents,
    );
    // Paginación en memoria post-sort.
    rows = rows.slice((page - 1) * pageSize, page * pageSize);
  }

  return { rows, total, page, pageSize };
}

/**
 * Últimos N productos activos para el home. `updatedAt desc` es proxy de
 * "destacados" en el MVP: editar un producto lo sube. Ver decisión en el
 * archivo del PR #6.
 */
export async function listFeaturedProducts(limit = 8): Promise<PublicProductCard[]> {
  const products = await prisma.product.findMany({
    where: { status: "active" },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      brand: { select: { name: true } },
      variants: { select: { sku: { select: { price: true, stock: true } } } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  return products.map((p) => {
    const skus = p.variants.map((v) => v.sku).filter((s) => s !== null);
    const prices = skus.map((s) => s.price);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brandName: p.brand.name,
      priceMinCents: prices.length ? Math.min(...prices) : 0,
      priceMaxCents: prices.length ? Math.max(...prices) : 0,
      primaryImageUrl: p.images[0]?.url ?? null,
      totalStock: skus.reduce((acc, s) => acc + s.stock, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Facetas para el sidebar de filtros
// ---------------------------------------------------------------------------

export type FilterFacets = {
  brands: Array<{ id: string; name: string; slug: string }>;
  colors: Array<{ id: string; name: string; hex: string }>;
  sizes: Array<{ label: string; sortOrder: number }>;
  priceRangeCents: { min: number; max: number };
};

/**
 * Facetas para el sidebar de filtros: solo marcas/colores/tallas que
 * efectivamente aparecen en productos activos. Rango de precio real.
 */
export async function getFilterFacets(): Promise<FilterFacets> {
  const [brands, colors, sizes, priceAgg] = await Promise.all([
    prisma.brand.findMany({
      where: { products: { some: { status: "active" } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.color.findMany({
      where: {
        // Solo colores con al menos un SKU en stock (evita callejones sin salida
        // en el filtro).
        variants: {
          some: { product: { status: "active" }, sku: { is: { stock: { gt: 0 } } } },
        },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, hex: true },
    }),
    prisma.size.findMany({
      where: {
        variants: {
          some: { product: { status: "active" }, sku: { is: { stock: { gt: 0 } } } },
        },
      },
      orderBy: { sortOrder: "asc" },
      select: { label: true, sortOrder: true },
    }),
    prisma.sku.aggregate({
      where: { variant: { product: { status: "active" } }, stock: { gt: 0 } },
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  return {
    brands,
    colors,
    sizes,
    priceRangeCents: {
      min: priceAgg._min.price ?? 0,
      max: priceAgg._max.price ?? 0,
    },
  };
}
