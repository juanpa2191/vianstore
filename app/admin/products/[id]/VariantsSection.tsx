"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { upsertVariant, deleteVariant } from "../actions";

type Color = { id: string; name: string; hex: string };
type Size = { id: string; label: string };

type Variant = {
  id: string;
  colorId: string;
  sizeId: string;
  color: { name: string; hex: string };
  size: { label: string };
  sku: { id: string; code: string; price: number; stock: number } | null;
};

export default function VariantsSection({
  productId,
  variants,
  colors,
  sizes,
}: {
  productId: string;
  variants: Variant[];
  colors: Color[];
  sizes: Size[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 p-6">
        <h2 className="font-display text-sm font-black tracking-widest text-neutral-500 uppercase">
          Variantes
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:border-neutral-400"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {adding ? "Cancelar" : "Agregar variante"}
        </button>
      </div>

      {adding && (
        <div className="border-b border-neutral-100 bg-neutral-50 p-4">
          <VariantRow
            mode="new"
            productId={productId}
            colors={colors}
            sizes={sizes}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {variants.length === 0 ? (
        <p className="p-8 text-center text-sm text-neutral-500">
          Sin variantes todavía. Agrega la primera para asignarle stock y precio.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[10px] font-black tracking-widest text-neutral-500 uppercase">
              <tr>
                <th className="px-3 py-3">Color</th>
                <th className="px-3 py-3">Talla</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Precio (COP)</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {variants.map((v) => (
                <VariantEditableRow
                  key={v.id}
                  variant={v}
                  productId={productId}
                  colors={colors}
                  sizes={sizes}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function VariantEditableRow({
  variant,
  productId,
  colors,
  sizes,
}: {
  variant: Variant;
  productId: string;
  colors: Color[];
  sizes: Size[];
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteVariant({ variantId: variant.id, productId });
      if (res.ok) {
        toast.success("Variante eliminada");
      } else {
        toast.error(res.formError ?? "No se pudo eliminar");
      }
      setConfirmDelete(false);
    });
  };

  return (
    <tr className="align-top">
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full ring-1 ring-neutral-300"
            style={{ backgroundColor: `#${variant.color.hex}` }}
            aria-hidden="true"
          />
          <span className="text-neutral-700">{variant.color.name}</span>
        </span>
      </td>
      <td className="px-3 py-3 text-neutral-700">{variant.size.label}</td>
      <td colSpan={4} className="px-3 py-3">
        <VariantRow
          mode="edit"
          productId={productId}
          colors={colors}
          sizes={sizes}
          initial={{
            colorId: variant.colorId,
            sizeId: variant.sizeId,
            code: variant.sku?.code ?? "",
            priceCents: variant.sku?.price ?? 0,
            stock: variant.sku?.stock ?? 0,
          }}
        />
        <div className="mt-2 flex justify-end">
          {confirmDelete ? (
            <span className="inline-flex items-center gap-2 text-[11px]">
              <span className="text-neutral-500">¿Eliminar?</span>
              <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="rounded bg-red-600 px-2 py-1 font-bold text-white hover:bg-red-700 disabled:bg-red-400"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded border border-neutral-200 px-2 py-1 font-bold text-neutral-700 hover:border-neutral-400"
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              Eliminar variante
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function VariantRow({
  mode,
  productId,
  colors,
  sizes,
  initial,
  onDone,
}: {
  mode: "new" | "edit";
  productId: string;
  colors: Color[];
  sizes: Size[];
  initial?: {
    colorId: string;
    sizeId: string;
    code: string;
    priceCents: number;
    stock: number;
  };
  onDone?: () => void;
}) {
  const [colorId, setColorId] = useState(initial?.colorId ?? "");
  const [sizeId, setSizeId] = useState(initial?.sizeId ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [priceCop, setPriceCop] = useState(
    initial ? String(Math.round(initial.priceCents / 100)) : "",
  );
  const [stock, setStock] = useState(initial ? String(initial.stock) : "0");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const onSave = () => {
    setErrors({});
    startTransition(async () => {
      // El input de precio pide COP; la Server Action espera centavos.
      const priceCents = Math.round(Number(priceCop || "0") * 100);
      const res = await upsertVariant({
        productId,
        colorId,
        sizeId,
        code: code.trim(),
        priceCents,
        stock: Number(stock || "0"),
      });
      if (res.ok) {
        toast.success(mode === "new" ? "Variante creada" : "Variante actualizada");
        onDone?.();
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        if (res.formError) toast.error(res.formError);
      }
    });
  };

  const readOnlyKeys = mode === "edit";

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      <div>
        <select
          value={colorId}
          onChange={(e) => setColorId(e.target.value)}
          disabled={readOnlyKeys}
          required
          title={
            readOnlyKeys
              ? "Para cambiar color, elimina la variante y créala de nuevo"
              : undefined
          }
          className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs focus:border-neutral-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
        >
          <option value="" disabled>
            Color
          </option>
          {colors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <select
          value={sizeId}
          onChange={(e) => setSizeId(e.target.value)}
          disabled={readOnlyKeys}
          required
          title={
            readOnlyKeys
              ? "Para cambiar talla, elimina la variante y créala de nuevo"
              : undefined
          }
          className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs focus:border-neutral-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
        >
          <option value="" disabled>
            Talla
          </option>
          {sizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="NIK-AF1-BLK-40"
          required
          className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 font-mono text-xs focus:border-neutral-400 focus:outline-none"
        />
        {errors.code && <p className="mt-1 text-[10px] font-semibold text-red-600">{errors.code}</p>}
      </div>
      <div>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={priceCop}
          onChange={(e) => setPriceCop(e.target.value)}
          required
          className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs tabular-nums focus:border-neutral-400 focus:outline-none"
          placeholder="450000"
        />
        {errors.priceCents && (
          <p className="mt-1 text-[10px] font-semibold text-red-600">{errors.priceCents}</p>
        )}
      </div>
      <div className="flex items-start gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          required
          className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs tabular-nums focus:border-neutral-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isPending ? "…" : mode === "new" ? "Crear" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
