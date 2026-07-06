"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { updateProduct, type ActionResult } from "../actions";

type Brand = { id: string; name: string };

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brandId: string;
  status: "draft" | "active" | "archived";
};

const STATUS: Array<{ value: "draft" | "active" | "archived"; label: string }> = [
  { value: "draft", label: "Borrador (no visible)" },
  { value: "active", label: "Activo (visible)" },
  { value: "archived", label: "Archivado" },
];

export default function GeneralSection({ product, brands }: { product: Product; brands: Brand[] }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    updateProduct,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Producto actualizado");
    if (state && !state.ok && state.formError) toast.error(state.formError);
  }, [state]);

  const fieldError = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 bg-white p-6 md:grid-cols-2"
    >
      <input type="hidden" name="id" value={product.id} />

      <h2 className="col-span-full font-display text-sm font-black tracking-widest text-neutral-500 uppercase">
        General
      </h2>

      <Field label="Nombre" name="name" error={fieldError?.name}>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={product.name}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
        />
      </Field>

      <Field label="Slug" name="slug" error={fieldError?.slug}>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={product.slug}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-neutral-400 focus:outline-none"
        />
      </Field>

      <Field label="Marca" name="brandId" error={fieldError?.brandId}>
        <select
          id="brandId"
          name="brandId"
          required
          defaultValue={product.brandId}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Estado" name="status" error={fieldError?.status}>
        <select
          id="status"
          name="status"
          required
          defaultValue={product.status}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
        >
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="col-span-full">
        <Field label="Descripción" name="description" error={fieldError?.description} optional>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={product.description ?? ""}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </Field>
      </div>

      <div className="col-span-full flex justify-end">
        <SubmitButton />
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
      <label htmlFor={name} className="mb-1 flex items-center gap-2 text-xs font-bold text-neutral-700">
        {label}
        {optional && <span className="text-[10px] font-medium text-neutral-400">(opcional)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}
