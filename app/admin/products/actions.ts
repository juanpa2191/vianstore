"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { slugify } from "@/lib/slug";

/**
 * Invalida las 3 vistas públicas del catálogo. Cualquier mutation admin sobre
 * producto / variante / imagen debe llamarla para que el cliente vea cambios
 * inmediatos (el home lista destacados, `/products` el listado con filtros y
 * `/p/[slug]` los PDPs individuales).
 */
function invalidatePublicCatalog() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/p/[slug]", "page");
}

/**
 * Resultado normalizado que consumen los forms del cliente.
 *
 * Contract explícito: `ok:true` con opcional `id/slug` para redirect en el
 * cliente; `ok:false` con `formError` (banner general) y/o `fieldErrors` (por
 * campo). Los forms de admin usan `useActionState` de React 19.
 */
export type ActionResult =
  | { ok: true; id?: string; slug?: string }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

const productStatusSchema = z.enum(["draft", "active", "archived"]);

const createProductSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
  slug: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  brandId: z.string().uuid("Marca inválida"),
  status: productStatusSchema,
});

/**
 * Extrae los issues por campo del ZodError y los convierte al shape que el
 * form del cliente espera. Sólo toma el primer mensaje por campo (más limpio
 * para UI que apilar tres errores).
 */
function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path[0];
    if (typeof path === "string" && !(path in out)) {
      out[path] = issue.message;
    }
  }
  return out;
}

export async function createProduct(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    brandId: formData.get("brandId")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "draft",
  };

  const parsed = createProductSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const data = parsed.data;
  const normalizedSlug = slugify(data.slug);

  try {
    const created = await prisma.product.create({
      data: {
        name: data.name,
        slug: normalizedSlug,
        description: data.description || null,
        brandId: data.brandId,
        status: data.status as ProductStatus,
      },
      select: { id: true },
    });
    // No redirigimos aquí: el cliente orquesta uploads de imágenes (una por
    // color seleccionado en el mismo form) antes de navegar al editor. Ver
    // NewProductForm.tsx.
    revalidatePath("/admin/products");
    // Si el status inicial es active, un producto nuevo aparece en el home
    // y en /products inmediatamente.
    if (data.status === "active") invalidatePublicCatalog();
    return { ok: true, id: created.id, slug: normalizedSlug };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return { ok: false, fieldErrors: { slug: "Ya existe un producto con este slug" } };
      }
      if (err.code === "P2003") {
        return { ok: false, fieldErrors: { brandId: "Marca no encontrada" } };
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Editor de producto: general, variantes, imágenes.
// ---------------------------------------------------------------------------

const updateProductSchema = createProductSchema.extend({
  id: z.string().uuid(),
});

export async function updateProduct(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const raw = {
    id: formData.get("id")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    brandId: formData.get("brandId")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "draft",
  };

  const parsed = updateProductSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const data = parsed.data;
  const normalizedSlug = slugify(data.slug);

  try {
    await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: normalizedSlug,
        description: data.description || null,
        brandId: data.brandId,
        status: data.status as ProductStatus,
      },
    });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.id}`);
    // Cambios de status/name/slug/description afectan las vistas públicas.
    invalidatePublicCatalog();
    return { ok: true, id: data.id, slug: normalizedSlug };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return { ok: false, fieldErrors: { slug: "Ya existe un producto con este slug" } };
      }
      if (err.code === "P2003") {
        return { ok: false, fieldErrors: { brandId: "Marca no encontrada" } };
      }
      if (err.code === "P2025") {
        return { ok: false, formError: "El producto ya no existe" };
      }
    }
    throw err;
  }
}

const upsertVariantSchema = z.object({
  productId: z.string().uuid(),
  colorId: z.string().uuid(),
  sizeId: z.string().uuid(),
  code: z.string().trim().min(1, "SKU code requerido").max(60),
  priceCents: z.coerce
    .number()
    .int("Precio debe ser entero (centavos)")
    .min(0, "Precio no puede ser negativo"),
  stock: z.coerce.number().int().min(0, "Stock no puede ser negativo"),
});

/**
 * Crea o actualiza una variante (color × talla) y su SKU asociado. La variante
 * y el SKU son 1:1, así que el upsert compuesto es atómico via transacción.
 */
export async function upsertVariant(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertVariantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const { productId, colorId, sizeId, code, priceCents, stock } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.variant.findUnique({
        where: {
          variant_product_color_size_uniq: { productId, colorId, sizeId },
        },
        select: { id: true, sku: { select: { id: true } } },
      });

      const variant = existing
        ? existing
        : await tx.variant.create({
            data: { productId, colorId, sizeId },
            select: { id: true, sku: { select: { id: true } } },
          });

      if (variant.sku) {
        await tx.sku.update({
          where: { id: variant.sku.id },
          data: { code, price: priceCents, stock },
        });
      } else {
        await tx.sku.create({
          data: { variantId: variant.id, code, price: priceCents, stock },
        });
      }
      return variant.id;
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    invalidatePublicCatalog();
    return { ok: true, id: result };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Dos uniques pueden dispararlo aquí: sku.code global vs. la tripla
      // (product_id, color_id, size_id) de la variante. `meta.target` trae
      // los nombres de columna involucrados en la constraint.
      const target = err.meta?.target;
      const targetStr = Array.isArray(target) ? target.join(",") : String(target ?? "");
      if (targetStr.includes("code")) {
        return { ok: false, fieldErrors: { code: "Ya existe un SKU con este código" } };
      }
      return {
        ok: false,
        formError: "Ya existe una variante con esa combinación de color y talla",
      };
    }
    throw err;
  }
}

const deleteVariantSchema = z.object({
  variantId: z.string().uuid(),
  productId: z.string().uuid(),
});

export async function deleteVariant(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteVariantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Datos inválidos" };

  try {
    // onDelete Cascade quita el SKU vinculado automáticamente.
    await prisma.variant.delete({ where: { id: parsed.data.variantId } });
  } catch (err) {
    // P2025 = fila ya no existe. Idempotente: doble-click o pestaña stale.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2025") {
      throw err;
    }
  }

  revalidatePath(`/admin/products/${parsed.data.productId}`);
  revalidatePath("/admin/products");
  invalidatePublicCatalog();
  return { ok: true };
}

class DuplicateColorImageError extends Error {
  constructor(public colorId: string | null) {
    super("duplicate color image");
  }
}

const attachImageSchema = z.object({
  productId: z.string().uuid(),
  // Solo recibimos el `path` del objeto en el bucket (devuelto por
  // requestImageUploadUrl). El server compone la URL pública — el cliente
  // NUNCA dicta URLs arbitrarias, así el DB solo referencia objetos que
  // subimos al bucket products.
  path: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[a-zA-Z0-9._/-]+$/, "Path inválido")
    .refine((p) => !p.startsWith("/") && !p.includes(".."), "Path inválido"),
  colorId: z.string().uuid().optional().or(z.literal("")),
});

export async function attachImage(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = attachImageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, formError: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { productId, path, colorId } = parsed.data;

  // Cross-field: el path debe vivir bajo la carpeta del producto que se dice
  // estar asociando. Evita que un admin con DevTools mezcle imagen de A con
  // registro de B (basura de datos, aunque no es un vector de seguridad —
  // ambos paths están dentro del mismo bucket público).
  if (!path.startsWith(`${productId}/`)) {
    return { ok: false, formError: "Path no corresponde al producto" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { ok: false, formError: "Storage no configurado" };
  }
  const url = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/products/${path}`;
  const normalizedColorId = colorId ? colorId : null;

  try {
    // sortOrder + duplicate-check + create en una sola transacción. Read
    // committed no es garantía estricta, pero para el volumen esperado (un
    // admin subiendo imágenes secuencialmente) sobra. UNIQUE explícito en
    // (productId, colorId) se evita porque Postgres trata NULLs como distintos
    // por default y necesitaría NULLS NOT DISTINCT o partial indexes.
    const img = await prisma.$transaction(async (tx) => {
      // Regla de negocio: máx 1 imagen por color por producto (NULL cuenta
      // como "cover" genérica y también respeta el máximo de 1).
      const existing = await tx.productImage.count({
        where: { productId, colorId: normalizedColorId },
      });
      if (existing > 0) {
        throw new DuplicateColorImageError(normalizedColorId);
      }

      const agg = await tx.productImage.aggregate({
        where: { productId },
        _max: { sortOrder: true },
      });
      const sortOrder = (agg._max.sortOrder ?? -1) + 1;
      return tx.productImage.create({
        data: { productId, url, sortOrder, colorId: normalizedColorId },
        select: { id: true },
      });
    });
    revalidatePath(`/admin/products/${productId}`);
    invalidatePublicCatalog();
    return { ok: true, id: img.id };
  } catch (err) {
    if (err instanceof DuplicateColorImageError) {
      return {
        ok: false,
        formError: err.colorId
          ? "Ya hay una imagen para ese color. Elimínala antes de subir otra."
          : "Ya hay una imagen sin color asignado. Elimínala antes de subir otra.",
      };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, formError: "Esa imagen ya está asociada al producto" };
    }
    throw err;
  }
}

const deleteImageSchema = z.object({
  imageId: z.string().uuid(),
  productId: z.string().uuid(),
});

export async function deleteImage(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Datos inválidos" };

  try {
    // Nota: dejamos el objeto en Storage. La política del bucket permite que
    // huerfanicen — el operador puede limpiar bulk en el dashboard de Supabase.
    // Un cron de mantenimiento vive fuera del scope del MVP.
    await prisma.productImage.delete({ where: { id: parsed.data.imageId } });
  } catch (err) {
    // Idempotente: doble-click o pestaña stale.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2025") {
      throw err;
    }
  }

  revalidatePath(`/admin/products/${parsed.data.productId}`);
  invalidatePublicCatalog();
  return { ok: true };
}

/**
 * Solicita a Supabase Storage una signed upload URL para el bucket `products`.
 * El cliente sube directo desde el browser al bucket usando esta URL — el
 * archivo nunca pasa por el server Next. Devuelve el path final (que luego
 * se compone con la URL pública para persistir en `product_image.url`).
 *
 * Notarás que este flujo NO usa el service role: `createSignedUploadUrl`
 * requiere una sesión autenticada como admin (chequeado por `requireAdmin`
 * arriba + validado por las policies del bucket que sólo dejan INSERT si el
 * JWT trae role='admin').
 */
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

export async function requestImageUploadUrl(input: {
  productId: string;
  filename: string;
}): Promise<
  | { ok: true; path: string; token: string }
  | { ok: false; formError: string }
> {
  await requireAdmin();

  const productId = z.string().uuid().safeParse(input.productId);
  if (!productId.success) return { ok: false, formError: "Product ID inválido" };

  const cleanName = input.filename
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    // Colapsa `..` a `.` — evita path traversal aparente en el filename final
    // que dejaría un objeto legítimo en Storage pero rechazado por attachImage.
    .replace(/\.{2,}/g, ".")
    .slice(0, 80);
  // Ext allowlist server-side. El bucket ya bloquea por MIME (via migration),
  // pero rechazar temprano evita gastar un token de firma en un archivo que
  // Storage va a rechazar después.
  const ext = cleanName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, formError: "Formato de archivo no permitido" };
  }

  const stamped = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${cleanName}`;
  const path = `${productId.data}/${stamped}`;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("products").createSignedUploadUrl(path);

  if (error || !data) {
    // No exponer el error de Supabase al cliente (puede contener nombres
    // de políticas, paths internos). Log server para debugging.
    console.error("[requestImageUploadUrl] Supabase signing failed", {
      productId: productId.data,
      err: error?.message,
    });
    return { ok: false, formError: "No se pudo iniciar la subida. Intenta de nuevo." };
  }

  return { ok: true, path, token: data.token };
}
