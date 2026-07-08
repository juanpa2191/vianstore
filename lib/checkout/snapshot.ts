import { z } from "zod";

/**
 * Shape inmutable de la dirección persistida en `Order.addressSnapshot` (JSON).
 * Se valida al ESCRIBIR (createOrder) y al LEER (success page) — evita
 * renderizar campos undefined si algún restore de DB o migración futura
 * corrompe el JSON.
 */
export const AddressSnapshotSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().nullable(),
  country: z.string().min(2).max(2),
});

export type AddressSnapshot = z.infer<typeof AddressSnapshotSchema>;
