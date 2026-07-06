import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GeneralSection from "./GeneralSection";
import VariantsSection from "./VariantsSection";
import ImagesSection from "./ImagesSection";
import StatusBadge from "../StatusBadge";

export const metadata = {
  title: "Editar producto — Admin",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, brands, colors, sizes] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        brandId: true,
        status: true,
        variants: {
          orderBy: [{ color: { name: "asc" } }, { size: { sortOrder: "asc" } }],
          select: {
            id: true,
            colorId: true,
            sizeId: true,
            color: { select: { name: true, hex: true } },
            size: { select: { label: true } },
            sku: { select: { id: true, code: true, price: true, stock: true } },
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            url: true,
            sortOrder: true,
            colorId: true,
            color: { select: { name: true } },
          },
        },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.color.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, hex: true },
    }),
    prisma.size.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true },
    }),
  ]);

  if (!product) notFound();

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
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900">
            {product.name}
          </h1>
          <StatusBadge status={product.status} />
          <span className="font-mono text-[11px] text-neutral-400">/{product.slug}</span>
          {product.status === "active" && (
            <Link
              href={`/p/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700 hover:border-neutral-400"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              Ver preview público
            </Link>
          )}
        </div>
      </div>

      <GeneralSection product={product} brands={brands} />

      <VariantsSection
        productId={product.id}
        variants={product.variants}
        colors={colors}
        sizes={sizes}
      />

      <ImagesSection productId={product.id} images={product.images} colors={colors} />
    </section>
  );
}
