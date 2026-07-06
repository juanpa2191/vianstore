import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import NewProductForm from "./NewProductForm";

export const metadata = {
  title: "Nuevo producto — Admin",
};

export default async function NewProductPage() {
  const [brands, colors] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.color.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, hex: true },
    }),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver a productos
        </Link>
        <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-neutral-900">
          Nuevo producto
        </h1>
        <p className="text-xs text-neutral-500">
          Define lo básico y sube 1 foto por color si quieres. Las tallas, stock y precio los ajustas
          en la siguiente pantalla.
        </p>
      </div>

      <NewProductForm brands={brands} colors={colors} />
    </section>
  );
}
