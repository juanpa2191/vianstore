import { getSiteUrl } from "@/lib/env";

/**
 * Normaliza el mensaje del provider a un slug corto. Nunca persistir el
 * mensaje crudo — puede tener URLs, tokens parciales o snippets del email.
 * Compartido por los helpers de order-confirmation / shipped / delivered.
 */
export function categorizeEmailError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("invalid_from")) return "resend:invalid_from";
  if (s.includes("validation_error")) return "resend:validation_error";
  if (s.includes("rate")) return "resend:rate_limited";
  if (s.includes("timeout") || s.includes("etimedout")) return "network:timeout";
  if (s.includes("email_provider_not_configured")) return "env:not_configured";
  return "provider_error";
}

/**
 * Devuelve la URL base normalizada. Si `NODE_ENV=production` y la URL cae
 * a localhost (env mal configurada), retorna null — el caller registra
 * `site_url_misconfigured` y aborta antes de enviar un link roto al cliente.
 */
export function getSiteUrlOrFail(): string | null {
  const url = getSiteUrl().replace(/\/$/, "");
  if (
    process.env.NODE_ENV === "production" &&
    /^https?:\/\/(localhost|127\.)/i.test(url)
  ) {
    return null;
  }
  return url;
}

/**
 * Primer token del nombre completo → nombre "corto" para el saludo.
 * `fullName` viene del snapshot validado por Zod, así que `.trim()` siempre
 * devuelve algo, pero mantenemos fallback por defensa.
 */
export function firstNameFrom(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "cliente";
}
