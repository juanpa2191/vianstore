/**
 * URL base pública del sitio. Se usa en sitemap.ts, robots.ts y metadataBase.
 *
 * Fallback a localhost si no está definida. Loguea un warning cuando corre
 * en un despliegue real (VERCEL=1 y NEXT_PUBLIC_SITE_URL vacío) para que el
 * operador lo vea en los logs y lo arregle sin bloquear el build local.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url;
  if (process.env.VERCEL === "1") {
    console.warn(
      "[env] NEXT_PUBLIC_SITE_URL no está definido en el deploy — sitemap y robots caerán en localhost.",
    );
  }
  return "http://localhost:3000";
}
