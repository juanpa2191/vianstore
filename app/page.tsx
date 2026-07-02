import { Award, MapPin, Heart } from "lucide-react";

export default function Home() {
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
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-xs">
          <span className="inline-block bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
            En construcción
          </span>
          <h3 className="mt-4 text-xl font-black font-display tracking-tight text-neutral-900">
            El catálogo llega en el PR #6
          </h3>
          <p className="mt-2 text-sm text-neutral-500 max-w-2xl leading-relaxed">
            Este es el punto de partida del proyecto (PR #1 — Bootstrap). En los próximos PRs se conectan
            base de datos, autenticación, catálogo con variantes por talla y color, carrito y checkout.
            Consulta <code className="font-mono text-[11px] bg-neutral-100 px-1.5 py-0.5 rounded">.claude/prs/README.md</code>{" "}
            para ver el roadmap completo.
          </p>
        </div>
      </section>
    </>
  );
}
