"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCartSession, getCartSessionReadOnly } from "@/lib/cart/session";

export type CartActionResult =
  | { ok: true; itemId?: string }
  | { ok: false; formError: string };

const uuidSchema = z.string().uuid();

const addToCartSchema = z.object({
  skuId: z.string().uuid(),
  qty: z.coerce.number().int().positive().max(50, "Máximo 50 por ítem"),
});

const updateQtySchema = z.object({
  itemId: z.string().uuid(),
  qty: z.coerce.number().int().min(0).max(50),
});

/**
 * Revalida las rutas que muestran el estado del carrito. El header trae el
 * badge (via `/`, `/products`, `/p/[slug]`) y `/cart` es la vista completa.
 */
function invalidateCart() {
  revalidatePath("/cart");
  // El header cuenta items en cada layout render; invalidamos las rutas
  // principales que lo re-renderizan.
  revalidatePath("/", "layout");
}

/**
 * Agrega `qty` unidades del SKU al carrito activo. Idempotente: si ya existe
 * el item, suma qty (capado por stock).
 */
export async function addToCart(input: unknown): Promise<CartActionResult> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, formError: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { skuId, qty } = parsed.data;

  const session = await getCartSession();

  try {
    const item = await prisma.$transaction(async (tx) => {
      // Leemos el SKU dentro de la tx para que status/stock sean lo más
      // frescos posible. Read Committed no da lock explícito, pero el rango
      // de la ventana stale se cierra a la duración de la tx.
      const sku = await tx.sku.findUnique({
        where: { id: skuId },
        select: {
          stock: true,
          variant: { select: { product: { select: { status: true } } } },
        },
      });
      if (!sku || sku.variant.product.status !== "active") {
        throw new UnavailableSkuError("Producto no disponible");
      }
      if (sku.stock === 0) {
        throw new UnavailableSkuError("Sin stock");
      }

      // Upsert atómico sobre el unique (cartId, skuId). Elimina el race del
      // findUnique+create/update: dos requests concurrentes con la misma
      // llave escriben secuenciados por el UNIQUE en DB. Después validamos
      // que el qty resultante no exceda stock — si excede, throw dispara
      // rollback y el increment no persiste.
      const upserted = await tx.cartItem.upsert({
        where: { cartId_skuId: { cartId: session.cartId, skuId } },
        create: { cartId: session.cartId, skuId, qty },
        update: { qty: { increment: qty } },
        select: { id: true, qty: true },
      });

      if (upserted.qty > sku.stock) {
        const previousQty = upserted.qty - qty;
        throw new StockExceededError(sku.stock, previousQty);
      }

      return upserted;
    });
    invalidateCart();
    return { ok: true, itemId: item.id };
  } catch (err) {
    if (err instanceof StockExceededError || err instanceof UnavailableSkuError) {
      return { ok: false, formError: err.message };
    }
    throw err;
  }
}

class UnavailableSkuError extends Error {}

class StockExceededError extends Error {
  constructor(stock: number, currentQty: number) {
    const canAdd = Math.max(0, stock - currentQty);
    super(
      canAdd === 0
        ? `Ya tienes el máximo disponible (${stock}) en el carrito`
        : `Solo hay ${stock} en stock; puedes agregar ${canAdd} más`,
    );
  }
}

/**
 * Cambia la cantidad de un item. qty=0 elimina la fila.
 * Solo actúa si el item pertenece al cart activo (defensa en profundidad).
 */
export async function updateQty(input: unknown): Promise<CartActionResult> {
  const parsed = updateQtySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, formError: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { itemId, qty } = parsed.data;

  // Read-only: no queremos que un itemId inválido cree un cart por request
  // (vector de DoS de recursos si el attacker itera).
  const session = await getCartSessionReadOnly();
  if (!session) return { ok: false, formError: "Ítem no encontrado" };

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      cartId: true,
      sku: { select: { stock: true } },
    },
  });
  if (!item || item.cartId !== session.cartId) {
    return { ok: false, formError: "Ítem no encontrado" };
  }

  if (qty === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    invalidateCart();
    return { ok: true };
  }

  if (qty > item.sku.stock) {
    return { ok: false, formError: `Solo hay ${item.sku.stock} en stock` };
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { qty } });
  invalidateCart();
  return { ok: true };
}

/**
 * Elimina un item del cart activo.
 */
export async function removeItem(rawItemId: unknown): Promise<CartActionResult> {
  const parsed = uuidSchema.safeParse(rawItemId);
  if (!parsed.success) return { ok: false, formError: "Ítem inválido" };

  const session = await getCartSessionReadOnly();
  if (!session) return { ok: true }; // idempotente: sin cart, no hay item que borrar

  try {
    await prisma.cartItem.deleteMany({
      where: { id: parsed.data, cartId: session.cartId },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      // Ya no existe — idempotente.
    } else {
      throw err;
    }
  }
  invalidateCart();
  return { ok: true };
}
