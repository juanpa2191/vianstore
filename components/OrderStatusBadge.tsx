import type { OrderStatus } from "@prisma/client";

const STYLE: Record<OrderStatus, { label: string; className: string }> = {
  pendiente_pago: {
    label: "Pendiente de pago",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  pagado: {
    label: "Pagado",
    className: "bg-blue-50 text-blue-800 ring-blue-200",
  },
  en_preparacion: {
    label: "En preparación",
    className: "bg-purple-50 text-purple-800 ring-purple-200",
  },
  enviado: {
    label: "Enviado",
    className: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  },
  entregado: {
    label: "Entregado",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  },
};

export default function OrderStatusBadge({
  status,
  size = "sm",
}: {
  status: OrderStatus;
  size?: "sm" | "md";
}) {
  const s = STYLE[status];
  const sizing =
    size === "md" ? "text-[11px] px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded font-black tracking-widest uppercase ring-1 ring-inset ${sizing} ${s.className}`}
    >
      {s.label}
    </span>
  );
}
