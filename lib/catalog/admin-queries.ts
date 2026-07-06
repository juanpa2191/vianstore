import { prisma } from "@/lib/prisma";
import type { ProductStatus } from "@prisma/client";

export type AdminProductListRow = {
  id: string;
  slug: string;
  name: string;
  status: ProductStatus;
  brandName: string;
  totalStock: number;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  primaryImageUrl: string | null;
  updatedAt: Date;
};

export type AdminProductListResult = {
  rows: AdminProductListRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminProductListFilters = {
  q?: string;
  status?: ProductStatus | "all";
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;

/**
 * Query paginada para el listado admin de productos.
 *
 * Agrega stock total y rango de precio via Prisma nested aggregations. No usa
 * FTS todavía (llega en PR #6); búsqueda por `q` es LIKE case-insensitive en
 * name y slug — cubre el use case admin y no requiere el índice GIN.
 */
export async function listAdminProducts(
  filters: AdminProductListFilters = {},
): Promise<AdminProductListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = filters.q?.trim();
  const status = filters.status && filters.status !== "all" ? filters.status : undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        updatedAt: true,
        brand: { select: { name: true } },
        variants: {
          select: {
            sku: { select: { price: true, stock: true } },
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    }),
  ]);

  const rows: AdminProductListRow[] = products.map((p) => {
    const skus = p.variants.map((v) => v.sku).filter((s) => s !== null);
    const totalStock = skus.reduce((acc, s) => acc + s.stock, 0);
    const prices = skus.map((s) => s.price);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      brandName: p.brand.name,
      totalStock,
      priceMinCents: prices.length > 0 ? Math.min(...prices) : null,
      priceMaxCents: prices.length > 0 ? Math.max(...prices) : null,
      primaryImageUrl: p.images[0]?.url ?? null,
      updatedAt: p.updatedAt,
    };
  });

  return { rows, total, page, pageSize };
}
