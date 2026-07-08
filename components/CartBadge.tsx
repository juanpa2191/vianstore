import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getCartItemCount } from "@/lib/cart/queries";

/**
 * Botón "Carrito" del header con badge de conteo.
 *
 * Es un Server Component: cuenta ítems en cada layout render (no requiere
 * estado global). Prisma cachea la query dentro del mismo request. Las
 * mutations del cart invalidan el layout via `revalidatePath("/", "layout")`.
 */
export default async function CartBadge() {
  const count = await getCartItemCount();
  return (
    <Link
      href="/cart"
      aria-label={
        count > 0
          ? `Abrir carrito (${count} ${count === 1 ? "ítem" : "ítems"})`
          : "Abrir carrito"
      }
      className="relative flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-800 transition-all hover:border-neutral-400 hover:bg-neutral-50"
    >
      <ShoppingBag className="h-4 w-4" />
      <span className="text-xs font-bold">Carrito</span>
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-black text-white ring-2 ring-white"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
