import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPublicProduct } from "@/lib/catalog/public-queries";
import { formatCentsRangeCOP } from "@/lib/format/money";
import ProductGallery from "./ProductGallery";

// Preview del PDP (product detail page). Este PR agrega solo la ruta como
// preview de admin — el storefront completo con listado, filtros y CTA de
// compra llega en PR #6. Aquí ya se visualiza el carrusel con las imágenes
// que el admin cargó.

export const metadata = {
  title: "Producto — VianStore",
};

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
              {product.brandName}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-neutral-900">
              {product.name}
            </h1>
            <p className="mt-2 font-mono text-sm text-amber-700">
              {product.priceMinCents === 0
                ? "Precio no disponible"
                : formatCentsRangeCOP(product.priceMinCents, product.priceMaxCents)}
            </p>
          </div>

          {product.description && (
            <p className="max-w-prose text-sm leading-relaxed text-neutral-600">
              {product.description}
            </p>
          )}

          {product.colors.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
                Colores y tallas disponibles
              </h2>
              <ul className="flex flex-col gap-3">
                {product.colors.map((c) => (
                  <li key={c.colorId} className="rounded-xl border border-neutral-200 bg-white p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded-full ring-1 ring-neutral-300"
                        style={{ backgroundColor: `#${c.colorHex}` }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-bold text-neutral-800">{c.colorName}</span>
                    </div>
                    <ul className="flex flex-wrap gap-1.5">
                      {c.sizes.map((s) => {
                        const soldOut = s.stock === 0;
                        return (
                          <li key={s.skuCode}>
                            <span
                              aria-disabled={soldOut}
                              title={soldOut ? "Sin stock" : `${s.stock} en stock`}
                              className={`inline-flex min-w-11 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-bold ${
                                soldOut
                                  ? "border-neutral-200 bg-neutral-50 text-neutral-300 line-through"
                                  : "border-neutral-300 bg-white text-neutral-800"
                              }`}
                            >
                              {s.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Preview del PDP para PR #5. El botón de compra, filtros del listado y checkout llegan en
            PRs posteriores.
          </p>
        </div>
      </div>
    </article>
  );
}
