"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { requestMagicLink, type MagicLinkState } from "./actions";

const initialState: MagicLinkState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      aria-live="polite"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Enviando enlace…</span>
        </>
      ) : (
        <>
          <Mail className="h-4 w-4" aria-hidden="true" />
          <span>Enviar enlace de acceso</span>
        </>
      )}
    </button>
  );
}

export default function MagicLinkForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(requestMagicLink, initialState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="next" value={next} />

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-[11px] font-bold tracking-widest text-neutral-500 uppercase"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tucorreo@ejemplo.com"
          aria-describedby="email-feedback"
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-xs transition-all placeholder:text-neutral-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
        />
      </div>

      <SubmitButton />

      <div id="email-feedback" role="status" aria-live="polite" className="min-h-[1.25rem]">
        {state.status === "success" ? (
          <p className="flex items-start gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Enviamos un enlace de acceso a <strong>{state.email}</strong>. Revisa tu bandeja de
              entrada y spam.
            </span>
          </p>
        ) : null}
        {state.status === "error" ? (
          <p className="flex items-start gap-1.5 text-xs font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{state.message}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}
