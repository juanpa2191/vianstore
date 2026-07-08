"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { upsertAddress, type AddressActionResult } from "./actions";

type Initial = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export default function AddressForm({ initial }: { initial: Initial | null }) {
  const [state, formAction] = useActionState<AddressActionResult | undefined, FormData>(
    upsertAddress,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Dirección guardada");
    if (state && !state.ok && state.formError) toast.error(state.formError);
  }, [state]);

  const fieldError = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4 rounded-xl border border-neutral-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre completo" name="fullName" error={fieldError?.fullName}>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            defaultValue={initial?.fullName ?? ""}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </Field>
        <Field label="Teléfono" name="phone" error={fieldError?.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={initial?.phone ?? ""}
            placeholder="+57 300 123 4567"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Dirección" name="line1" error={fieldError?.line1}>
        <input
          id="line1"
          name="line1"
          type="text"
          required
          defaultValue={initial?.line1 ?? ""}
          placeholder="Calle 10 # 5-20"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
        />
      </Field>

      <Field label="Complemento" name="line2" error={fieldError?.line2} optional>
        <input
          id="line2"
          name="line2"
          type="text"
          defaultValue={initial?.line2 ?? ""}
          placeholder="Apto 302, Torre B"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Ciudad" name="city" error={fieldError?.city}>
          <input
            id="city"
            name="city"
            type="text"
            required
            defaultValue={initial?.city ?? ""}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </Field>
        <Field label="Departamento" name="state" error={fieldError?.state}>
          <input
            id="state"
            name="state"
            type="text"
            required
            defaultValue={initial?.state ?? ""}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </Field>
        <Field label="Código postal" name="postalCode" error={fieldError?.postalCode} optional>
          <input
            id="postalCode"
            name="postalCode"
            type="text"
            defaultValue={initial?.postalCode ?? ""}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </Field>
      </div>

      <Field label="País (ISO 2)" name="country" error={fieldError?.country}>
        <input
          id="country"
          name="country"
          type="text"
          required
          maxLength={2}
          defaultValue={initial?.country ?? "CO"}
          className="w-full max-w-24 rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm uppercase focus:border-neutral-400 focus:outline-none"
        />
      </Field>

      <div className="flex justify-end pt-2">
        <SubmitButton hasExisting={initial !== null} />
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  optional,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 flex items-center gap-2 text-xs font-bold text-neutral-700"
      >
        {label}
        {optional && (
          <span className="text-[10px] font-medium text-neutral-400">(opcional)</span>
        )}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function SubmitButton({ hasExisting }: { hasExisting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Guardando…" : hasExisting ? "Actualizar dirección" : "Guardar dirección"}
    </button>
  );
}
