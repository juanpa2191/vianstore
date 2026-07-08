"use client";

import { useState, useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import ProductGallery from "./ProductGallery";
import { formatCentsCOP } from "@/lib/format/money";
import type { PublicProduct } from "@/lib/catalog/public-queries";
import { addToCart } from "@/app/cart/actions";

const LOW_STOCK_THRESHOLD = 3;

/**
 * Viewer del PDP con estado compartido color/talla.
 *
 * Contiene la galería (recibe imágenes reordenadas para poner primero la del
 * color activo) + los selectores + el CTA. El CTA queda deshabilitado hasta
 * que llegue PR #7 (carrito) — por ahora solo confirma la selección con toast.
 */
export default function ProductViewer({ product }: { product: PublicProduct }) {
  const [colorId, setColorId] = useState<string | null>(
    product.colors[0]?.colorId ?? null,
  );
  const [sizeLabel, setSizeLabel] = useState<string | null>(null);

  const activeColor = product.colors.find((c) => c.colorId === colorId) ?? null;
  const activeSize = activeColor?.sizes.find((s) => s.label === sizeLabel) ?? null;

  // Reordena imágenes: primero la del color activo (si existe), luego el resto.
  // React Compiler (React 19) memoriza este cálculo automáticamente — no
  // usamos useMemo manual porque `preserve-manual-memoization` lo bloquea.
  const activeColorName = activeColor?.colorName ?? null;
  const orderedImages = activeColorName
    ? [
        ...product.images.filter((i) => i.colorName === activeColorName),
        ...product.images.filter((i) => i.colorName !== activeColorName),
      ]
    : product.images;

  const priceLabel = activeSize
    ? formatCentsCOP(activeSize.priceCents)
    : product.priceMinCents === 0
      ? "Precio no disponible"
      : product.priceMinCents === product.priceMaxCents
        ? formatCentsCOP(product.priceMinCents)
        : `Desde ${formatCentsCOP(product.priceMinCents)}`;

  const stockState: "in_stock" | "low" | "sold_out" | null = activeSize
    ? activeSize.stock === 0
      ? "sold_out"
      : activeSize.stock <= LOW_STOCK_THRESHOLD
        ? "low"
        : "in_stock"
    : null;

  const [isPending, startTransition] = useTransition();

  const onAddToCart = () => {
    if (!activeSize) return;
    startTransition(async () => {
      const res = await addToCart({ skuId: activeSize.skuId, qty: 1 });
      if (res.ok) {
        toast.success(`Agregado al carrito · ${activeSize.skuCode}`);
      } else {
        toast.error(res.formError);
      }
    });
  };

  return (
    <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
      <ProductGallery
        key={colorId ?? "default"}
        images={orderedImages}
        productName={product.name}
      />

      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
            {product.brandName}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-neutral-900">
            {product.name}
          </h1>
          <p
            key={priceLabel /* re-anima con blip cuando cambia */}
            className="mt-2 font-mono text-lg text-amber-700 tabular-nums"
          >
            {priceLabel}
          </p>
        </div>

        {product.description && (
          <p className="max-w-prose text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>
        )}

        {product.colors.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="mb-2 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                Color{activeColor ? `: ${activeColor.colorName}` : ""}
              </h2>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => {
                  const isActive = c.colorId === colorId;
                  const allSoldOut = c.sizes.every((s) => s.stock === 0);
                  return (
                    <button
                      key={c.colorId}
                      type="button"
                      onClick={() => {
                        setColorId(c.colorId);
                        setSizeLabel(null);
                      }}
                      aria-pressed={isActive}
                      aria-label={c.colorName}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                        isActive
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                      }`}
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-full ring-1 ring-neutral-300"
                        style={{ backgroundColor: `#${c.colorHex}` }}
                        aria-hidden="true"
                      />
                      <span>{c.colorName}</span>
                      {allSoldOut && (
                        <span
                          className={`text-[9px] font-black tracking-widest uppercase ${
                            isActive ? "text-neutral-400" : "text-neutral-400"
                          }`}
                        >
                          agotado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeColor && (
              <div>
                <h2 className="mb-2 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                  Talla{activeSize ? `: ${activeSize.label}` : ""}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {activeColor.sizes.map((s) => {
                    const soldOut = s.stock === 0;
                    const isActive = s.label === sizeLabel;
                    return (
                      <button
                        key={s.skuCode}
                        type="button"
                        onClick={() => (soldOut ? undefined : setSizeLabel(s.label))}
                        disabled={soldOut}
                        aria-pressed={isActive}
                        title={soldOut ? "Sin stock" : `${s.stock} en stock`}
                        className={`min-w-11 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                          isActive
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : soldOut
                              ? "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-300 line-through"
                              : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                {stockState && (
                  <p
                    className={`mt-2 text-[11px] font-semibold ${
                      stockState === "sold_out"
                        ? "text-red-600"
                        : stockState === "low"
                          ? "text-amber-700"
                          : "text-emerald-700"
                    }`}
                  >
                    {stockState === "sold_out"
                      ? "Sin stock"
                      : stockState === "low"
                        ? `Pocas unidades: ${activeSize?.stock} disponibles`
                        : `En stock`}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-500">Sin variantes disponibles.</p>
        )}

        <button
          type="button"
          onClick={onAddToCart}
          disabled={!activeSize || activeSize.stock === 0 || isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-black tracking-widest text-white uppercase shadow-sm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {isPending
            ? "Agregando…"
            : activeSize && activeSize.stock === 0
              ? "Agotado"
              : activeSize
                ? "Agregar al carrito"
                : "Elige color y talla"}
        </button>
        <p className="text-[10px] text-neutral-400">
          Checkout se activa en PR #8.
        </p>
      </div>
    </div>
  );
}
