"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { createOrder } from "./actions";

export default function ConfirmButton({
  disabled,
  expectedTotalCents,
}: {
  disabled: boolean;
  expectedTotalCents: number;
}) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const res = await createOrder(expectedTotalCents);
      // Si createOrder llama a redirect(), la function no retorna (throw). Si
      // retorna es porque falló (ok: false).
      if (res && !res.ok) toast.error(res.formError);
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPending}
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-black tracking-widest text-white uppercase shadow-sm hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
    >
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      {isPending ? "Confirmando…" : "Confirmar pedido"}
    </button>
  );
}
