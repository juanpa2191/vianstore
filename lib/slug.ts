/**
 * Convierte un string arbitrario a un slug URL-safe.
 *
 * - Normaliza Unicode (NFKD) y elimina diacríticos (á→a, ñ→n).
 * - Reemplaza cualquier no-alfanumérico por `-`.
 * - Colapsa guiones repetidos y recorta los de los bordes.
 * - Baja a lowercase.
 *
 * Usado tanto por el form admin como por las Server Actions al validar/normalizar.
 * Determinista y sin dependencias externas.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
