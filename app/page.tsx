import Link from "next/link";
import { Award, MapPin, Heart, ArrowRight } from "lucide-react";
import { listFeaturedProducts } from "@/lib/catalog/public-queries";
import ProductCard from "@/components/catalog/ProductCard";

export default async function Home() {
  const featured = await listFeaturedProducts(8);

  return (
    <>
      <section className="w-full bg-neutral-950 text-white relative overflow-hidden py-10 px-4 sm:px-8">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <span className="inline-block bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
              Colección Exclusiva 2026
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-display tracking-tight leading-tight">
              Viste los Sneakers que Marcan la Tendencia Urbana
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-md">
              Encuentra calzado premium con las últimas siluetas importadas. Garantía de talla perfecta y
              envíos rápidos en todo el territorio nacional.
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[10px] font-bold text-neutral-300">
              <span className="flex items-center gap-1 border-r border-neutral-800 pr-3">
                <Award className="h-4 w-4 text-amber-500" />
                <span>100% Originales</span>
              </span>
              <span className="flex items-center gap-1 border-r border-neutral-800 pr-3">
                <MapPin className="h-4 w-4 text-amber-500" />
                <span>Envíos Garantizados</span>
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-amber-500" />
                <span>Soporte por Instagram</span>
              </span>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-black tracking-widest text-white uppercase transition-colors hover:bg-amber-500"
            >
              Ver catálogo
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-black tracking-tight text-neutral-900">
              Destacados
            </h3>
            <p className="text-xs text-neutral-500">Los más recientes del catálogo.</p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-950"
          >
            Ver todos
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center text-sm text-neutral-500">
            Sin productos activos todavía. Activa productos desde el admin.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
