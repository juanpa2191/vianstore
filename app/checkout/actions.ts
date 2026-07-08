"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { getShippingCostCents } from "@/lib/checkout/config";
import { AddressSnapshotSchema, type AddressSnapshot } from "@/lib/checkout/snapshot";

export type CheckoutResult =
  | { ok: true; orderId: string }
  | { ok: false; formError: string };

class InsufficientStockError extends Error {
  constructor(
    public skuCode: string,
    public availableStock: number,
    public requestedQty: number,
  ) {
    super(`${skuCode}: solo hay ${availableStock} en stock (pediste ${requestedQty})`);
  }
}

class EmptyCartError extends Error {}
class MissingAddressError extends Error {}
class PriceChangedError extends Error {
  constructor(public actualTotalCents: number) {
    super("El precio cambió; revisa el resumen antes de confirmar");
  }
}
class UnavailableItemError extends Error {
  constructor(public itemDesc: string) {
    super(`${itemDesc} ya no está disponible; retíralo del carrito`);
  }
}

/**
 * Confirma el carrito del usuario y persiste el pedido.
 *
 * Todo en `prisma.$transaction`:
 *   1. Trae address + cart-id.
 *   2. `SELECT ... FOR UPDATE` sobre skus y cart_items (`ORDER BY id` para
 *      determinismo de locks).
 *   3. **Re-lee** los cart items DENTRO de la tx (crítico: si el usuario
 *      hizo double-submit, el segundo hilo desbloquea, encuentra cart vacío
 *      y aborta con EmptyCartError). Snapshot JS previo se descarta.
 *   4. Valida stock, status y precio (contra el `expectedTotalCents` del
 *      cliente si viene).
 *   5. Crea Order + OrderItems con snapshot inmutable (Zod).
 *   6. Decrementa sku.stock. CHECK stock >= 0 atrapa race residual (P2010).
 *   7. Borra cart_items.
 *
 * `redirect()` corre FUERA del catch — `NEXT_REDIRECT` no es capturado por
 * los filtros de custom errors ni P2010, pero mover el redirect afuera lo
 * hace explícito para el mantainer futuro.
 */
export async function createOrder(
  expectedTotalCents?: number,
): Promise<CheckoutResult> {
  const session = await requireUser();

  let createdOrderId: string;

  try {
    createdOrderId = await prisma.$transaction(
      async (tx) => {
        const address = await tx.address.findUnique({
          where: { userId: session.userId },
        });
        if (!address) throw new MissingAddressError();

        const cart = await tx.cart.findUnique({
          where: { userId: session.userId },
          select: { id: true },
        });
        if (!cart) throw new EmptyCartError();

        // Lock cart_items del user primero para cerrar el double-submit
        // window. Cualquier segunda invocación paralela espera aquí, y al
        // desbloquear encuentra 0 filas (deleteMany del ganador ya corrió).
        await tx.$queryRaw`
          SELECT id FROM public.cart_item
          WHERE cart_id = ${cart.id}::uuid
          ORDER BY id
          FOR UPDATE
        `;

        // Re-lee los items TRAS el lock — source of truth = DB, no memoria JS.
        const items = await tx.cartItem.findMany({
          where: { cartId: cart.id },
          orderBy: { id: "asc" },
          select: {
            skuId: true,
            qty: true,
            sku: {
              select: {
                code: true,
                variant: {
                  select: {
                    color: { select: { name: true } },
                    size: { select: { label: true } },
                    product: { select: { name: true, status: true } },
                  },
                },
              },
            },
          },
        });
        if (items.length === 0) throw new EmptyCartError();

        // Lock sku rows en orden determinístico (ORDER BY id) para evitar
        // deadlocks futuros si el planner cambia.
        const skuIds = items.map((it) => it.skuId);
        await tx.$queryRaw`
          SELECT id FROM public.sku
          WHERE id = ANY(${skuIds}::uuid[])
          ORDER BY id
          FOR UPDATE
        `;

        const lockedSkus = await tx.sku.findMany({
          where: { id: { in: skuIds } },
          select: { id: true, code: true, stock: true, price: true },
        });
        const stockById = new Map(lockedSkus.map((s) => [s.id, s]));

        let subtotalCents = 0;
        const itemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

        for (const it of items) {
          const locked = stockById.get(it.skuId);
          if (!locked) {
            throw new UnavailableItemError(it.sku.code);
          }
          if (it.sku.variant.product.status !== "active") {
            throw new UnavailableItemError(
              `${it.sku.variant.product.name} (${it.sku.code})`,
            );
          }
          if (locked.stock < it.qty) {
            throw new InsufficientStockError(locked.code, locked.stock, it.qty);
          }

          const unitPrice = locked.price;
          const lineSubtotal = unitPrice * it.qty;
          subtotalCents += lineSubtotal;

          itemsData.push({
            skuId: it.skuId,
            qty: it.qty,
            unitPriceCents: unitPrice,
            subtotalCents: lineSubtotal,
            skuCode: it.sku.code,
            productName: it.sku.variant.product.name,
            colorName: it.sku.variant.color.name,
            sizeLabel: it.sku.variant.size.label,
          });
        }

        const shippingCents = getShippingCostCents();
        const totalCents = subtotalCents + shippingCents;

        // Guard contra "precio cambió mientras el user llenaba el checkout".
        // El cliente pasa el total que vio; si difiere, abortamos y forzamos
        // refresh para que revise. Server-side sigue siendo source of truth.
        if (
          typeof expectedTotalCents === "number" &&
          expectedTotalCents !== totalCents
        ) {
          throw new PriceChangedError(totalCents);
        }

        const snapshot: AddressSnapshot = AddressSnapshotSchema.parse({
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        });

        const order = await tx.order.create({
          data: {
            userId: session.userId,
            userEmail: session.email,
            addressSnapshot: snapshot,
            subtotalCents,
            shippingCents,
            totalCents,
            items: { createMany: { data: itemsData } },
          },
          select: { id: true },
        });

        // Decrementos en loop: N round-trips. Con carts de 1-3 items del MVP
        // es despreciable. Para carts grandes migrar a un UPDATE ... FROM
        // VALUES en raw. Documentado como deuda técnica.
        for (const it of items) {
          await tx.sku.update({
            where: { id: it.skuId },
            data: { stock: { decrement: it.qty } },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return order.id;
      },
      { timeout: 15_000, isolationLevel: "ReadCommitted" },
    );
  } catch (err) {
    if (err instanceof EmptyCartError) {
      return { ok: false, formError: "Tu carrito está vacío" };
    }
    if (err instanceof MissingAddressError) {
      return { ok: false, formError: "Agrega una dirección de envío antes de confirmar" };
    }
    if (err instanceof InsufficientStockError) {
      return { ok: false, formError: err.message };
    }
    if (err instanceof UnavailableItemError) {
      return { ok: false, formError: err.message };
    }
    if (err instanceof PriceChangedError) {
      return { ok: false, formError: err.message };
    }
    // Race residual del CHECK stock >= 0 (no debería con FOR UPDATE).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2010") {
      return {
        ok: false,
        formError: "Stock insuficiente. Actualiza el carrito e intenta de nuevo.",
      };
    }
    throw err;
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout"); // badge del header
  // `redirect()` lanza NEXT_REDIRECT sintético — vive fuera del try/catch
  // para que ningún filtro futuro lo capture por accidente.
  redirect(`/checkout/success/${createdOrderId}`);
}
