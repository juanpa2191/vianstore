"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

type GalleryImage = {
  id: string;
  url: string;
  colorName: string | null;
};

/**
 * Carrusel de imágenes del PDP.
 *
 * - Con 0 imágenes: placeholder con ícono.
 * - Con 1 imagen: sin controles (mostrar como foto única).
 * - Con 2+: prev/next + navegación por teclado (← →) + dots indicators.
 *
 * `next/image` con fill: los remotePatterns de next.config.ts autorizan el
 * host de Supabase Storage y placehold.co. Sin `unoptimized` porque el PDP
 * sí se beneficia de la optimización a diferencia del thumbnail de admin.
 */
export default function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [index, setIndex] = useState(0);
  const hasMany = images.length > 1;

  const goTo = useCallback(
    (dir: 1 | -1) => {
      if (!hasMany) return;
      setIndex((i) => (i + dir + images.length) % images.length);
    },
    [images.length, hasMany],
  );

  useEffect(() => {
    if (!hasMany) return;
    const onKey = (e: KeyboardEvent) => {
      // No secuestrar flechas cuando el usuario está escribiendo en un input
      // o navegando dentro de un select. Los PRs futuros meten forms en el
      // mismo layout — este guard previene la regresión.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, hasMany]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 text-neutral-300">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="h-10 w-10" aria-hidden="true" />
          <span className="text-xs font-semibold">Sin imágenes</span>
        </div>
      </div>
    );
  }

  const active = images[index];
  const activeAlt = active.colorName
    ? `${productName} — ${active.colorName}`
    : productName;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100"
        role="region"
        aria-roledescription="carrusel"
        aria-label={`Galería de ${productName}`}
      >
        <Image
          key={active.id}
          src={active.url}
          alt={activeAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority={index === 0}
        />

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => goTo(-1)}
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-900 shadow-md ring-1 ring-neutral-200 hover:bg-white"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(1)}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-900 shadow-md ring-1 ring-neutral-200 hover:bg-white"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Dots como botones normales — un tablist sin tabpanels asociados
                confunde a screen readers. `aria-current` marca el activo. */}
            <div
              className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5"
              aria-label="Indicadores de imagen"
            >
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  aria-label={`Ir a imagen ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => setIndex(i)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === index
                      ? "w-6 bg-neutral-900"
                      : "bg-white/90 ring-1 ring-neutral-300 hover:bg-neutral-100"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Live region para screen readers: anuncia el cambio de imagen. */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          Imagen {index + 1} de {images.length}: {activeAlt}
        </span>
      </div>

      {hasMany && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver imagen ${i + 1} de ${images.length}`}
              aria-current={i === index ? "true" : undefined}
              className={`relative aspect-square overflow-hidden rounded-lg border transition-all ${
                i === index
                  ? "border-neutral-900 ring-2 ring-neutral-900"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="100px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
