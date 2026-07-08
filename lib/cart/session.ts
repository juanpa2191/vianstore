import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  CART_COOKIE_MAX_AGE_S,
  CART_COOKIE_NAME,
  decodeCartCookie,
  encodeCartCookie,
} from "./cookie";

export type CartSession = {
  cartId: string;
  userId: string | null;
  /** true si esta llamada creó un cart nuevo (útil para escribir la cookie). */
  created: boolean;
};

/**
 * Solo lectura: devuelve el cart existente sin crear ninguno. Para el badge
 * del header y páginas que renderizan el estado — evita llenar la DB de
 * carritos vacíos por cada visita anónima. Los reads en RSC son idempotentes.
 */
export const getCartSessionReadOnly = cache(async (): Promise<CartSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const existing = await prisma.cart.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return existing
      ? { cartId: existing.id, userId: user.id, created: false }
      : null;
  }

  const cookieStore = await cookies();
  const decodedId = decodeCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value);
  if (!decodedId) return null;

  const existing = await prisma.cart.findUnique({
    where: { id: decodedId },
    select: { id: true, userId: true },
  });
  if (!existing || existing.userId !== null) return null;
  return { cartId: existing.id, userId: null, created: false };
});

/**
 * Resuelve o crea el cart activo del request actual. Se usa desde Server
 * Actions que van a mutar el cart (addToCart), donde tiene sentido crear
 * ansiosa la fila y escribir la cookie.
 *
 * IMPORTANTE: escribir cookies solo funciona desde Server Action o Route
 * Handler (Next 16 lo bloquea desde Server Components). Este helper NO debe
 * llamarse desde un RSC puro — usar `getCartSessionReadOnly` en su lugar.
 */
export const getCartSession = cache(async (): Promise<CartSession> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // `upsert` elimina la race de dos Server Actions concurrentes del mismo
    // user recién logueado sin cart, ambas llegando a `create` y una fallando
    // por el UNIQUE en `Cart.userId`. `created` se deduce comparando timestamps.
    const before = Date.now();
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
      select: { id: true, createdAt: true },
    });
    return {
      cartId: cart.id,
      userId: user.id,
      created: cart.createdAt.getTime() >= before,
    };
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(CART_COOKIE_NAME)?.value;
  const decodedId = decodeCartCookie(raw);

  if (decodedId) {
    // Verifica que el cart aún existe y sigue siendo anónimo.
    const existing = await prisma.cart.findUnique({
      where: { id: decodedId },
      select: { id: true, userId: true },
    });
    if (existing && existing.userId === null) {
      return { cartId: existing.id, userId: null, created: false };
    }
    // Cart fue borrado o migrado — creamos uno nuevo abajo.
  }

  const created = await prisma.cart.create({
    data: { userId: null },
    select: { id: true },
  });
  // Intentamos escribir la cookie; en un RSC esto es no-op (Next lo permite
  // silenciosamente vía try/catch a nivel superior). En Server Actions y
  // Route Handlers sí persiste.
  try {
    cookieStore.set(CART_COOKIE_NAME, encodeCartCookie(created.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CART_COOKIE_MAX_AGE_S,
    });
  } catch {
    // Server Component sin write context. El próximo Action / Route Handler
    // escribirá la cookie cuando vuelva a resolver la sesión.
  }
  return { cartId: created.id, userId: null, created: true };
});

/**
 * Fusiona un cart anónimo (identificado por la cookie actual) con el cart
 * del usuario recién logueado. Suma qty por SKU, capando por stock disponible.
 *
 * Se llama tras confirmar la sesión Supabase (auth callback). Idempotente: si
 * no hay cookie o el cart anónimo ya fue migrado, es no-op.
 */
export async function mergeAnonymousCartIntoUser(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const anonCartId = decodeCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value);
  if (!anonCartId) return;

  const anon = await prisma.cart.findUnique({
    where: { id: anonCartId },
    select: {
      id: true,
      userId: true,
      items: {
        select: {
          skuId: true,
          qty: true,
          sku: { select: { stock: true, variant: { select: { product: { select: { status: true } } } } } },
        },
      },
    },
  });
  if (!anon || anon.userId !== null) {
    // Ya migrado o cookie stale — quita la cookie.
    cookieStore.delete(CART_COOKIE_NAME);
    return;
  }

  // Todo el merge en una sola transacción para no dejar carts a medio migrar.
  // Cookie se borra solo tras commit.
  await prisma.$transaction(async (tx) => {
    const userCart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });

    for (const item of anon.items) {
      // Descartamos items de productos que ya no están activos.
      if (item.sku.variant.product.status !== "active") continue;

      // Upsert atómico por unique (cartId, skuId). No hace falta findUnique
      // previo: LEAST-like cap lo hacemos leyendo la fila después. Como el
      // merge corre en el auth callback (baja concurrencia por usuario), es
      // suficiente.
      const upserted = await tx.cartItem.upsert({
        where: { cartId_skuId: { cartId: userCart.id, skuId: item.skuId } },
        create: { cartId: userCart.id, skuId: item.skuId, qty: item.qty },
        update: { qty: { increment: item.qty } },
        select: { id: true, qty: true },
      });

      // Cap por stock: si el upsert excedió, ajustamos.
      if (upserted.qty > item.sku.stock) {
        const capped = Math.max(0, item.sku.stock);
        if (capped === 0) {
          await tx.cartItem.delete({ where: { id: upserted.id } });
        } else {
          await tx.cartItem.update({
            where: { id: upserted.id },
            data: { qty: capped },
          });
        }
      }
    }

    // Borra el cart anónimo (cascade a sus items).
    await tx.cart.delete({ where: { id: anon.id } });
  });

  // Solo se borra la cookie tras commit — si la tx falla, la próxima llamada
  // reintenta el merge con la misma cookie.
  cookieStore.delete(CART_COOKIE_NAME);
}
