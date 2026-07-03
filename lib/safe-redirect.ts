/**
 * Devuelve un pathname interno seguro para usar como destino de redirect.
 *
 * Evita open-redirects: solo se aceptan paths que empiecen con `/` y no con
 * `//` ni `/\` (protocolo-relativos). Cualquier cosa distinta cae al fallback.
 */
export function safeInternalPath(candidate: string | null | undefined, fallback = "/"): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  return candidate;
}
