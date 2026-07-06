import { prisma } from "@/lib/prisma";

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

export async function getPublicProduct(slug: string): Promise<PublicProduct | null> {
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
