"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@prisma/client";
import { Truck, CheckCircle2, PackageCheck, XCircle, Send } from "lucide-react";
import {
  cancelOrder,
  markDelivered,
  markInPreparation,
  markPaid,
  markShipped,
} from "../actions";

const LABEL: Record<OrderStatus, string> = {
  pendiente_pago: "Pendiente de pago",
  pagado: "Pagado",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default function TransitionsPanel({
  orderId,
  currentStatus,
  allowed,
  currentTrackingCarrier,
  currentTrackingCode,
  carrierOptions,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  allowed: OrderStatus[];
  currentTrackingCarrier: string | null;
  currentTrackingCode: string | null;
  carrierOptions: Array<{ slug: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [openShip, setOpenShip] = useState(false);
  const [carrier, setCarrier] = useState(currentTrackingCarrier ?? "");
  const [code, setCode] = useState(currentTrackingCode ?? "");
  const [note, setNote] = useState("");
  const [carrierError, setCarrierError] = useState("");
  const [codeError, setCodeError] = useState("");

  /**
   * Ejecutor de acción cuyo `note` es capturado explícitamente en el momento
   * de invocación — así una nota escrita en el form de "Marcar enviado" NO
   * se cuela como razón de "Cancelar pedido" si el admin cambia de idea.
   * Cada botón pasa el `note` que corresponde a su modo (hoy: el mismo state,
   * pero el reset por acción limpia el buffer post-éxito).
   */
  const run = (fn: () => Promise<{ ok: boolean; formError?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success("Estado actualizado");
        setOpenShip(false);
        setNote("");
      } else if (res.formError) {
        toast.error(res.formError);
      }
    });
  };

  const onShip = () => {
    setCarrierError("");
    setCodeError("");
    startTransition(async () => {
      const res = await markShipped({ orderId, carrier, code, note });
      if (res.ok) {
        toast.success("Pedido marcado como enviado");
        setOpenShip(false);
        setNote("");
        // Reset del form para que un SPA-nav a otro pedido no arrastre datos.
        setCarrier("");
        setCode("");
      } else {
        if (res.fieldErrors?.carrier) setCarrierError(res.fieldErrors.carrier);
        if (res.fieldErrors?.code) setCodeError(res.fieldErrors.code);
        if (res.formError) toast.error(res.formError);
      }
    });
  };

  if (allowed.length === 0) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
          Acciones
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          El pedido está en estado <strong>{LABEL[currentStatus]}</strong>: no hay más
          transiciones disponibles.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 font-display text-xs font-black tracking-widest text-neutral-500 uppercase">
        Acciones
      </h2>

      <div className="flex flex-wrap gap-2">
        {allowed.includes("pagado") && (
          <button
            type="button"
            onClick={() => run(() => markPaid({ orderId, note: "" }))}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black tracking-widest text-white uppercase shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Marcar pagado
          </button>
        )}
        {allowed.includes("en_preparacion") && (
          <button
            type="button"
            onClick={() => run(() => markInPreparation({ orderId, note: "" }))}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-black tracking-widest text-white uppercase shadow-sm hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            En preparación
          </button>
        )}
        {allowed.includes("enviado") && (
          <button
            type="button"
            onClick={() => setOpenShip((v) => !v)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black tracking-widest text-white uppercase shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            {openShip ? "Cancelar" : "Marcar enviado"}
          </button>
        )}
        {allowed.includes("entregado") && (
          <button
            type="button"
            onClick={() => run(() => markDelivered({ orderId, note: "" }))}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black tracking-widest text-white uppercase shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Marcar entregado
          </button>
        )}
        {allowed.includes("cancelado") && (
          <button
            type="button"
            onClick={() => {
              const reason = prompt(
                "¿Motivo de la cancelación? (opcional)\n\nEl stock será repuesto.",
              );
              if (reason === null) return; // cancelado el prompt
              // Zod cap a 500 chars — recortamos en cliente para dar mejor UX.
              run(() => cancelOrder({ orderId, note: reason.slice(0, 500) }));
            }}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black tracking-widest text-red-700 uppercase hover:border-red-400 disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Cancelar pedido
          </button>
        )}
      </div>

      {openShip && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <h3 className="mb-3 text-[10px] font-black tracking-widest text-neutral-500 uppercase">
            Datos de envío
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label
                htmlFor="carrier"
                className="mb-1 block text-xs font-bold text-neutral-700"
              >
                Transportadora
              </label>
              <select
                id="carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
              >
                <option value="" disabled>
                  Selecciona…
                </option>
                {carrierOptions.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              {carrierError && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {carrierError}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="code"
                className="mb-1 block text-xs font-bold text-neutral-700"
              >
                Número de guía
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="GUIA123456"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-neutral-400 focus:outline-none"
              />
              {codeError && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {codeError}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3">
            <label
              htmlFor="note"
              className="mb-1 block text-xs font-bold text-neutral-700"
            >
              Nota (opcional)
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onShip}
              disabled={isPending}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-black tracking-widest text-white uppercase shadow-sm hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {isPending ? "Guardando…" : "Confirmar envío"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
