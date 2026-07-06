import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { PublicProductCard } from "@/lib/catalog/public-queries";
import { formatCentsCOP } from "@/lib/format/money";

export default function ProductCard({ product }: { product: PublicProductCard }) {
  const soldOut = product.totalStock === 0;
  return (
    <Link
      href={`/p/${product.slug}`}
      className="group flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-2 transition-all hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-sm"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-neutral-300">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
        {soldOut && (
          <span className="absolute top-2 right-2 rounded bg-neutral-900/90 px-2 py-0.5 text-[10px] font-black tracking-widest text-white uppercase">
            Agotado
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-2 pb-2">
        <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
          {product.brandName}
        </span>
        <span className="line-clamp-2 text-sm font-bold text-neutral-900">{product.name}</span>
        <span className="font-mono text-xs text-amber-700 tabular-nums">
          {product.priceMinCents === 0
            ? "Sin precio"
            : product.priceMinCents === product.priceMaxCents
              ? formatCentsCOP(product.priceMinCents)
              : `Desde ${formatCentsCOP(product.priceMinCents)}`}
        </span>
      </div>
    </Link>
  );
}
