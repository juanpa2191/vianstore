"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export type AddressActionResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

const upsertSchema = z.object({
  fullName: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Teléfono inválido")
    .max(30)
    .regex(/^[\d +().-]+$/, "Solo dígitos, espacios y + - ( )"),
  line1: z.string().trim().min(3, "Requerido").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  // MVP: solo despachamos a Colombia. Ampliar a un enum corto cuando
  // el negocio lo pida.
  country: z.literal("CO").default("CO"),
});

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

export async function upsertAddress(
  _prev: AddressActionResult | undefined,
  formData: FormData,
): Promise<AddressActionResult> {
  const session = await requireUser();

  const raw = {
    fullName: formData.get("fullName")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    line1: formData.get("line1")?.toString() ?? "",
    line2: formData.get("line2")?.toString() ?? "",
    city: formData.get("city")?.toString() ?? "",
    state: formData.get("state")?.toString() ?? "",
    postalCode: formData.get("postalCode")?.toString() ?? "",
    country: (formData.get("country")?.toString() || "CO").toUpperCase(),
  };
  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const data = parsed.data;

  await prisma.address.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      fullName: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode || null,
      country: data.country,
    },
    update: {
      fullName: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode || null,
      country: data.country,
    },
  });

  revalidatePath("/account/address");
  revalidatePath("/checkout");
  return { ok: true };
}
