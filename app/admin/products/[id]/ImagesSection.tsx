"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Trash2, ImageOff } from "lucide-react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { attachImage, deleteImage, requestImageUploadUrl } from "../actions";

type Color = { id: string; name: string; hex: string };

type ProductImg = {
  id: string;
  url: string;
  sortOrder: number;
  colorId: string | null;
  color: { name: string } | null;
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB. Suficiente para JPG optimizado.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export default function ImagesSection({
  productId,
  images,
  colors,
}: {
  productId: string;
  images: ProductImg[];
  colors: Color[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string>("");

  // Regla de negocio (PR #5): máx 1 imagen por color por producto. `selectedColorId`
  // vacío representa la "cover" sin color asignado — también respeta el máximo.
  const usedColorIds = new Set(images.map((i) => i.colorId ?? ""));
  const colorAlreadyUsed = usedColorIds.has(selectedColorId);

  const onPickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset el input para que "subir la misma foto dos veces" siga disparando el change.
    e.target.value = "";

    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      toast.error("Formato no permitido — usa JPG, PNG, WEBP o AVIF");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagen supera 5 MB");
      return;
    }

    setUploading(true);
    try {
      const signed = await requestImageUploadUrl({ productId, filename: file.name });
      if (!signed.ok) {
        toast.error(signed.formError);
        return;
      }

      const supabase = createBrowserSupabase();
      const { error: upErr } = await supabase.storage
        .from("products")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (upErr) {
        toast.error(`Fallo al subir: ${upErr.message}`);
        return;
      }

      const attached = await attachImage({
        productId,
        path: signed.path,
        colorId: selectedColorId || undefined,
      });
      if (!attached.ok) {
        toast.error(attached.formError ?? "No se pudo asociar la imagen");
        return;
      }

      toast.success("Imagen subida");
      // Deja el select en "sin color" tras subir OK para que el próximo upload
      // no arranque bloqueado sobre el color recién ocupado.
      setSelectedColorId("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col justify-between gap-3 border-b border-neutral-100 p-6 sm:flex-row sm:items-center">
        <h2 className="font-display text-sm font-black tracking-widest text-neutral-500 uppercase">
          Imágenes
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-[11px] font-semibold text-neutral-500">
            Asociar a color (opcional)
            <select
              value={selectedColorId}
              onChange={(e) => setSelectedColorId(e.target.value)}
              className="ml-2 rounded-lg border border-neutral-200 px-2 py-1 text-xs focus:border-neutral-400 focus:outline-none"
            >
              <option value="">— Sin color —</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_MIME.join(",")}
            onChange={onFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={onPickFile}
            disabled={uploading || colorAlreadyUsed}
            title={
              colorAlreadyUsed
                ? "Ese color ya tiene imagen. Elimínala antes de subir otra."
                : undefined
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {uploading ? "Subiendo…" : "Subir imagen"}
          </button>
        </div>
      </div>
      {colorAlreadyUsed && (
        <p className="border-b border-neutral-100 bg-amber-50 px-6 py-2 text-xs text-amber-800">
          {selectedColorId === ""
            ? "Ya hay una imagen sin color asignado. Elimínala antes de subir otra."
            : "Ese color ya tiene imagen. Elimínala antes de subir otra."}
        </p>
      )}

      {images.length === 0 ? (
        <p className="p-8 text-center text-sm text-neutral-500">
          <ImageOff className="mx-auto mb-2 h-6 w-6 text-neutral-300" aria-hidden="true" />
          Sin imágenes todavía.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <ImageCard key={img.id} img={img} productId={productId} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ImageCard({ img, productId }: { img: ProductImg; productId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteImage({ imageId: img.id, productId });
      if (res.ok) toast.success("Imagen eliminada");
      else toast.error(res.formError ?? "No se pudo eliminar");
      setConfirmDelete(false);
    });
  };

  return (
    <li className="relative overflow-hidden rounded-lg border border-neutral-200">
      <div className="relative aspect-square bg-neutral-100">
        <Image src={img.url} alt="" fill className="object-cover" sizes="200px" unoptimized />
      </div>
      <div className="flex items-center justify-between gap-2 p-2 text-[11px]">
        <span className="truncate text-neutral-500">
          {img.color?.name ?? "Sin color"}
        </span>
        {confirmDelete ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="rounded bg-red-600 px-2 py-0.5 font-bold text-white hover:bg-red-700 disabled:bg-red-400"
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded border border-neutral-200 px-2 py-0.5 font-bold text-neutral-700 hover:border-neutral-400"
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-red-600 hover:text-red-700"
            aria-label="Eliminar imagen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}
