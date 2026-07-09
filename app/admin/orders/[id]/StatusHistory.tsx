import type { AdminOrderStatusChange } from "@/lib/orders/admin-queries";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export default function StatusHistory({
  history,
}: {
  history: AdminOrderStatusChange[];
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
        Historial
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin cambios de estado registrados.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {history.map((h) => (
            <li key={h.id} className="flex flex-col gap-1 border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {h.fromStatus && (
                  <>
                    <OrderStatusBadge status={h.fromStatus} />
                    <span className="text-neutral-400">→</span>
                  </>
                )}
                <OrderStatusBadge status={h.toStatus} />
                <span className="text-neutral-500">
                  {h.changedAt.toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                por <span className="font-mono">{h.changedByEmail}</span>
              </p>
              {h.note && (
                <p className="mt-1 rounded-lg bg-neutral-50 p-2 text-[11px] text-neutral-700">
                  {h.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
