import { prisma } from "@/lib/prisma";
import { getCartSessionReadOnly } from "./session";

export type CartLineItem = {
  itemId: string;
  skuId: string;
  qty: number;
  priceCents: number;
  stock: number;
  productSlug: string;
  productName: string;
  brandName: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  skuCode: string;
  imageUrl: string | null;
  // true si el producto está inactivo → mostrar disabled con warning.
  unavailable: boolean;
  // qty se auto-limita a esto en subtotales cuando excede el stock actual.
  effectiveQty: number;
};

export type CartView = {
  cartId: string;
  userId: string | null;
  items: CartLineItem[];
  subtotalCents: number;
  totalQty: number;
};

export async function getCartView(): Promise<CartView> {
  const session = await getCartSessionReadOnly();
  if (!session) {
    return { cartId: "", userId: null, items: [], subtotalCents: 0, totalQty: 0 };
  }

  const items = await prisma.cartItem.findMany({
    where: { cartId: session.cartId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      qty: true,
      skuId: true,
      sku: {
        select: {
          code: true,
          price: true,
          stock: true,
          variant: {
            select: {
              colorId: true,
              color: { select: { name: true, hex: true } },
              size: { select: { label: true } },
              product: {
                select: {
                  slug: true,
                  name: true,
                  status: true,
                  brand: { select: { name: true } },
                  // Traemos hasta 5 imágenes; en JS elegimos la del color de la
                  // variante como preferida. El `where` no puede depender del
                  // `colorId` del row padre en Prisma nested select, así que
                  // acotamos por `take` para evitar over-fetch.
                  images: {
                    orderBy: { sortOrder: "asc" },
                    take: 5,
                    select: { url: true, colorId: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const lines: CartLineItem[] = items.map((it) => {
    const variant = it.sku.variant;
    const product = variant.product;

    // Preferir la imagen asociada al color de la variante; fallback a la
    // primera imagen del producto.
    const matchedByColor = product.images.find((img) => img.colorId === variant.colorId);
    const imageUrl = matchedByColor?.url ?? product.images[0]?.url ?? null;

    const unavailable = product.status !== "active";
    const effectiveQty = unavailable ? 0 : Math.min(it.qty, it.sku.stock);

    return {
      itemId: it.id,
      skuId: it.skuId,
      qty: it.qty,
      priceCents: it.sku.price,
      stock: it.sku.stock,
      productSlug: product.slug,
      productName: product.name,
      brandName: product.brand.name,
      colorName: variant.color.name,
      colorHex: variant.color.hex,
      sizeLabel: variant.size.label,
      skuCode: it.sku.code,
      imageUrl,
      unavailable,
      effectiveQty,
    };
  });

  const subtotalCents = lines.reduce((acc, l) => acc + l.priceCents * l.effectiveQty, 0);
  const totalQty = lines.reduce((acc, l) => acc + l.effectiveQty, 0);

  return {
    cartId: session.cartId,
    userId: session.userId,
    items: lines,
    subtotalCents,
    totalQty,
  };
}

/**
 * Solo el conteo — versión ligera para el badge del header. Evita el JOIN
 * pesado del `getCartView` en cada render del layout.
 */
export async function getCartItemCount(): Promise<number> {
  const session = await getCartSessionReadOnly();
  if (!session) return 0;
  const agg = await prisma.cartItem.aggregate({
    where: { cartId: session.cartId },
    _sum: { qty: true },
  });
  return agg._sum.qty ?? 0;
}
