import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getPublicProduct } from "@/lib/catalog/public-queries";
import { formatCentsCOP } from "@/lib/format/money";
import ProductViewer from "./ProductViewer";

// PDP (product detail page) público. La galería, el selector color→talla y el
// CTA viven en ProductViewer (client) por el estado interactivo. Este server
// component solo carga los datos y arma metadatos SEO.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) {
    return { title: "Producto no encontrado — VianStore" };
  }
  const title = `${product.name} — ${product.brandName} · VianStore`;
  const description =
    product.description ??
    `${product.name} de ${product.brandName}. Colores y tallas disponibles en VianStore.`;
  const primaryImage = product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/p/${product.slug}`,
      images: primaryImage
        ? [{ url: primaryImage, alt: product.name, width: 800, height: 800 }]
        : undefined,
    },
    twitter: {
      card: primaryImage ? "summary_large_image" : "summary",
      title,
      description,
      images: primaryImage ? [primaryImage] : undefined,
    },
    other: {
      "og:price:amount":
        product.priceMinCents > 0 ? String(product.priceMinCents / 100) : "",
      "og:price:currency": "COP",
    },
  };
}

// Escapa una string JSON para embeberla dentro de un tag <script>.
// `dangerouslySetInnerHTML` NO escapa el contenido (es el opt-out del escape
// de React). `JSON.stringify` escapa comillas y backslash pero deja pasar
// `<` (que forma `</script>`) y U+2028 / U+2029 (rompen `JSON.parse` en el
// navegador). Construimos la regex dinámicamente para no meter esos chars
// al source de este archivo (rompen el parser de TS al ser line terminators).
const SCRIPT_UNSAFE_RE = new RegExp(`[<${String.fromCharCode(0x2028, 0x2029)}]`, "g");
const SCRIPT_UNSAFE_MAP: Record<string, string> = {
  "<": "\\u003c",
  [String.fromCharCode(0x2028)]: "\\u2028",
  [String.fromCharCode(0x2029)]: "\\u2029",
};

function escapeForScript(json: string): string {
  return json.replace(SCRIPT_UNSAFE_RE, (ch) => SCRIPT_UNSAFE_MAP[ch] ?? ch);
}

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();

  // JSON-LD para snippets ricos. Precio en unidad (no centavos) según spec.
  // AggregateOffer solo considera SKUs con stock > 0: Google penaliza cuando
  // `offerCount` incluye ítems agotados como disponibles.
  const inStockSkus = product.colors.flatMap((c) => c.sizes.filter((s) => s.stock > 0));
  const inStockPrices = inStockSkus.map((s) => s.priceCents);
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: { "@type": "Brand", name: product.brandName },
    image: product.images.map((i) => i.url),
    offers:
      inStockPrices.length > 0
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "COP",
            lowPrice: (Math.min(...inStockPrices) / 100).toFixed(0),
            highPrice: (Math.max(...inStockPrices) / 100).toFixed(0),
            offerCount: inStockSkus.length,
            availability: "https://schema.org/InStock",
          }
        : undefined,
  };

  const safeJsonLd = escapeForScript(JSON.stringify(jsonLd));

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver al catálogo
      </Link>

      <ProductViewer product={product} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd }}
      />

      {/* Precio mínimo como texto visible fuera del viewer para SEO en case de que el
          crawler no renderice el JS del ProductViewer. */}
      {product.priceMinCents > 0 && (
        <p className="sr-only">
          Precio desde {formatCentsCOP(product.priceMinCents)}
        </p>
      )}
    </article>
  );
}
