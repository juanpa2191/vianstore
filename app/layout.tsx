import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { ShoppingBag, AtSign } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "VianStore Sneakers — Calzado urbano premium",
  description:
    "Sneakers originales y calzado urbano premium. Encuentra tu talla, paga fácil y recibe en tu ciudad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col bg-neutral-50/50">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 select-none">
              <Logo size="sm" />
              <div>
                <h1 className="text-lg font-black tracking-tight font-display text-neutral-900">
                  VIANSTORE SNEAKERS
                </h1>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
                  @vianstore14 • premium shoes
                </p>
              </div>
            </Link>

            <nav className="flex flex-wrap justify-center gap-1.5 md:gap-2">
              <Link
                href="/"
                className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white shadow-sm"
              >
                Catálogo
              </Link>
              <Link
                href="/"
                className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-all"
              >
                Nosotros
              </Link>
              <Link
                href="/"
                className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-all"
              >
                Contacto
              </Link>
            </nav>

            <button
              type="button"
              className="relative p-2.5 rounded-xl border bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 transition-all flex items-center gap-1.5 cursor-pointer"
              aria-label="Abrir carrito"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs font-bold">Carrito</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full">{children}</main>

        <footer className="bg-neutral-900 text-white mt-12 border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-neutral-400">
            <div className="space-y-3 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Logo size="sm" />
                <h3 className="text-sm font-black text-white font-display uppercase tracking-wider">
                  VS Sneakers
                </h3>
              </div>
              <p className="leading-relaxed max-w-xs mx-auto md:mx-0">
                Distribuidores apasionados del calzado urbano premium. Síguenos en redes para promos y
                sorteos mensuales.
              </p>
              <a
                href="https://www.instagram.com/vianstore14"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-neutral-200 hover:text-amber-500 transition-colors font-semibold"
              >
                <AtSign className="h-4 w-4 text-amber-500" />
                <span>@vianstore14 en Instagram</span>
              </a>
            </div>

            <div className="space-y-3 text-center md:text-left">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Políticas Post-Venta
              </h4>
              <p className="leading-relaxed">
                <strong>Cambio de talla:</strong> hasta 15 días calendario si la horma no asienta.
              </p>
              <p className="leading-relaxed">
                <strong>Garantía física:</strong> defectos de fabricación en costuras y suela por 30 días.
              </p>
            </div>

            <div className="space-y-3 text-center md:text-left">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Asistencia
              </h4>
              <p className="leading-relaxed">
                ¿Necesitas ayuda con tu pedido o un cambio? Escríbenos por Instagram y te atendemos rápido.
              </p>
              <p className="text-[10px] text-neutral-500">
                © {new Date().getFullYear()} VS Sneakers (vianstore14). Todos los derechos reservados.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
