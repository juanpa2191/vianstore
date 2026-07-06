import type { ProductStatus } from "@prisma/client";

const STYLE: Record<ProductStatus, { label: string; className: string }> = {
  active: {
    label: "Activo",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  draft: {
    label: "Borrador",
    className: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  },
  archived: {
    label: "Archivado",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
};

export default function StatusBadge({ status }: { status: ProductStatus }) {
  const s = STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black tracking-widest uppercase ring-1 ring-inset ${s.className}`}
    >
      {s.label}
    </span>
  );
}
