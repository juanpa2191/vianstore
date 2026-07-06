"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { createProduct, requestImageUploadUrl, attachImage } from "../actions";
import { slugify } from "@/lib/slug";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";

// Slug derivado del nombre cuando el usuario aún no lo ha tocado. Un
// `useEffect` con setState causaría cascada + advertencia de React 19; render
// derivado es más limpio y respeta la regla `react-hooks/set-state-in-effect`.

type Brand = { id: string; name: string };
type Color = { id: string; name: string; hex: string };

const STATUS: Array<{ value: "draft" | "active" | "archived"; label: string }> = [
  { value: "draft", label: "Borrador (no visible al público)" },
  { value: "active", label: "Activo (visible)" },
  { value: "archived", label: "Archivado" },
];

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

type ColorFile = {
  colorId: string;
  file: File;
};

export default function NewProductForm({
  brands,
  colors,
}: {
  brands: Brand[];
  colors: Color[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Map colorId → { file, previewUrl }. Marcar/desmarcar color solo cambia
  // presencia en el map; el archivo por color es opcional.
  const [pickedColors, setPickedColors] = useState<Map<string, File | null>>(new Map());

  const slug = slugOverride ?? slugify(name);

  const toggleColor = (colorId: string) => {
    setPickedColors((prev) => {
      const next = new Map(prev);
      if (next.has(colorId)) next.delete(colorId);
      else next.set(colorId, null);
      return next;
    });
  };

  const setColorFile = (colorId: string, file: File | null) => {
    if (file) {
      if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
        toast.error(`${file.name}: formato no permitido (JPG/PNG/WEBP/AVIF)`);
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: supera 5 MB`);
        return;
      }
    }
    setPickedColors((prev) => {
      const next = new Map(prev);
      next.set(colorId, file);
      return next;
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("slug", slug);
      fd.set("description", description);
      fd.set("brandId", brandId);
      fd.set("status", status);

      const res = await createProduct(undefined, fd);
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        if (res.formError) toast.error(res.formError);
        return;
      }
      const productId = res.id;
      if (!productId) {
        toast.error("Producto creado pero sin id — revisa el listado");
        router.push("/admin/products");
        return;
      }

      // Sube cada archivo elegido en paralelo. Si alguno falla se avisa; el
      // producto ya está creado y el admin ajusta imágenes desde el editor.
      const toUpload: ColorFile[] = [];
      for (const [colorId, file] of pickedColors.entries()) {
        if (file) toUpload.push({ colorId, file });
      }

      if (toUpload.length > 0) {
        const supabase = createBrowserSupabase();
        const results = await Promise.allSettled(
          toUpload.map(async ({ colorId, file }) => {
            const signed = await requestImageUploadUrl({ productId, filename: file.name });
            if (!signed.ok) throw new Error(signed.formError);

            const { error: upErr } = await supabase.storage
              .from("products")
              .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
            if (upErr) throw new Error(upErr.message);

            const attached = await attachImage({ productId, path: signed.path, colorId });
            if (!attached.ok) throw new Error(attached.formError ?? "attach failed");
          }),
        );

        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length === toUpload.length) {
          toast.error("Producto creado, pero ninguna imagen se subió");
        } else if (failed.length > 0) {
          toast.warning(
            `Producto creado. ${toUpload.length - failed.length}/${toUpload.length} imágenes subidas`,
          );
        } else {
          toast.success(`Producto creado con ${toUpload.length} imagen(es)`);
        }
      } else {
        toast.success("Producto creado");
      }

      router.push(`/admin/products/${productId}`);
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-3xl space-y-5 rounded-xl border border-neutral-200 bg-white p-6"
    >
      <Field label="Nombre" name="name" error={fieldErrors.name}>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          placeholder="Nike Air Force 1 Low"
        />
      </Field>

      <Field label="Slug" name="slug" error={fieldErrors.slug} hint="URL pública: /p/{slug}">
        <input
          id="slug"
          name="slug"
          type="text"
          required
          value={slug}
          onChange={(e) => setSlugOverride(e.target.value === "" ? null : e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-neutral-400 focus:outline-none"
          placeholder="nike-air-force-1-low"
        />
      </Field>

      <Field label="Descripción" name="description" error={fieldErrors.description} optional>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          placeholder="Clásico atemporal en cuero, silueta baja y suela Air."
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Marca" name="brandId" error={fieldErrors.brandId}>
          <select
            id="brandId"
            name="brandId"
            required
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          >
            <option value="" disabled>
              Selecciona una marca
            </option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Estado" name="status" error={fieldErrors.status}>
          <select
            id="status"
            name="status"
            required
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          >
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-xs font-bold text-neutral-700">
          Colores disponibles <span className="font-medium text-neutral-400">(opcional)</span>
        </legend>
        <p className="mb-3 text-[11px] text-neutral-500">
          Marca los colores que aplican al producto. Puedes subir una foto por color ahora, o
          hacerlo después desde el editor.
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {colors.map((c) => {
            const checked = pickedColors.has(c.id);
            const file = pickedColors.get(c.id) ?? null;
            return (
              <li
                key={c.id}
                className={`rounded-lg border p-3 transition-colors ${
                  checked ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-white"
                }`}
              >
                <label className="flex items-center gap-2 text-sm text-neutral-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleColor(c.id)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-neutral-300"
                    style={{ backgroundColor: `#${c.hex}` }}
                    aria-hidden="true"
                  />
                  <span>{c.name}</span>
                </label>
                {checked && (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:border-neutral-400">
                      <Upload className="h-3 w-3" aria-hidden="true" />
                      {file ? "Cambiar imagen" : "Subir imagen"}
                      <input
                        type="file"
                        accept={ALLOWED_MIME.join(",")}
                        className="hidden"
                        onChange={(e) => setColorFile(c.id, e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {file && (
                      <>
                        <span className="truncate text-[11px] text-neutral-500">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setColorFile(c.id, null)}
                          className="text-neutral-400 hover:text-red-600"
                          aria-label="Quitar imagen"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isPending ? "Creando…" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  optional,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
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
      {hint && !error && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
