"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Minus, Plus, Trash2, AlertTriangle, ImageOff } from "lucide-react";
import type { CartLineItem } from "@/lib/cart/queries";
import { formatCentsCOP } from "@/lib/format/money";
import { removeItem, updateQty } from "./actions";

export default function CartItems({ items }: { items: CartLineItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it) => (
        <li key={it.itemId}>
          <CartItemRow item={it} />
        </li>
      ))}
    </ul>
  );
}

function CartItemRow({ item }: { item: CartLineItem }) {
  const [isPending, startTransition] = useTransition();
  // Estado local para que los +/- se sientan instantáneos; la Server Action
  // confirma o rechaza (por stock). Si rechaza, revertimos al server-side qty.
  const [qty, setQty] = useState(item.qty);

  const setQtyOnServer = (nextQty: number) => {
    if (nextQty < 0) return;
    startTransition(async () => {
      const res = await updateQty({ itemId: item.itemId, qty: nextQty });
      if (!res.ok) {
        toast.error(res.formError);
        setQty(item.qty);
      }
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      const res = await removeItem(item.itemId);
      if (!res.ok) toast.error(res.formError);
    });
  };

  const canIncrement = qty < item.stock && !item.unavailable;
  const canDecrement = qty > 0 && !item.unavailable;
  const lineTotalCents = item.priceCents * item.effectiveQty;

  return (
    <div
      className={`flex gap-4 rounded-xl border bg-white p-4 ${
        item.unavailable ? "border-amber-200 bg-amber-50" : "border-neutral-200"
      }`}
      aria-busy={isPending}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-neutral-300">
            <ImageOff className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
              {item.brandName}
            </span>
            <Link
              href={`/p/${item.productSlug}`}
              className="block truncate text-sm font-bold text-neutral-900 hover:underline"
            >
              {item.productName}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-neutral-300"
                  style={{ backgroundColor: `#${item.colorHex}` }}
                  aria-hidden="true"
                />
                {item.colorName}
              </span>
              <span>Talla {item.sizeLabel}</span>
              <span className="font-mono text-neutral-400">{item.skuCode}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            aria-label="Eliminar del carrito"
            className="text-neutral-400 hover:text-red-600 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {item.unavailable && (
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Producto no disponible. Elimínalo del carrito.
          </p>
        )}

        {!item.unavailable && item.qty > item.stock && (
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Solo quedan {item.stock} en stock. Ajusta la cantidad.
          </p>
        )}

        <div className="flex items-end justify-between gap-3">
          <div
            className={`inline-flex items-center rounded-lg border border-neutral-200 bg-white ${
              item.unavailable ? "opacity-50" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => {
                const next = qty - 1;
                setQty(next);
                setQtyOnServer(next);
              }}
              disabled={!canDecrement || isPending}
              aria-label="Disminuir cantidad"
              className="rounded-l-lg px-2 py-1.5 text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => {
                const next = qty + 1;
                setQty(next);
                setQtyOnServer(next);
              }}
              disabled={!canIncrement || isPending}
              aria-label="Aumentar cantidad"
              className="rounded-r-lg px-2 py-1.5 text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-right">
            <div className="font-mono text-sm font-bold tabular-nums text-neutral-900">
              {formatCentsCOP(lineTotalCents)}
            </div>
            {item.qty > 1 && !item.unavailable && (
              <div className="text-[10px] text-neutral-400">
                {formatCentsCOP(item.priceCents)} c/u
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
