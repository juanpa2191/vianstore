import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-redirect";
import { mergeAnonymousCartIntoUser } from "@/lib/cart/session";

/**
 * Callback OAuth / magic link.
 *
 * Supabase redirige acá con `?code=...` tras confirmar el email o volver del
 * provider. Intercambiamos el code por una sesión (que queda persistida como
 * cookies via nuestro `createClient` server-side) y redirigimos al `next`.
 *
 * `next` viene del querystring — se pasa por `safeInternalPath` para evitar
 * open-redirects hacia dominios externos.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"), "/");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange failed:", error.message);
    return NextResponse.redirect(new URL("/login?error=exchange_failed", origin));
  }

  // Fusiona el carrito anónimo (cookie firmada) con el del user recién
  // autenticado. Idempotente: si no hay cookie, es no-op. Fallo aquí no
  // debe bloquear el login — logueamos y seguimos.
  if (data.user) {
    try {
      await mergeAnonymousCartIntoUser(data.user.id);
    } catch (err) {
      console.error("[auth/callback] cart merge failed:", err);
    }
  }

  // Construir la URL final con `new URL()` (en vez de concat de strings) para
  // que caracteres de control o rutas anómalas en `next` no se filtren al header
  // Location. `safeInternalPath` ya sanitizó el prefijo; esto es defensa extra.
  //
  // Nota: no se resuelve el fallback cross-browser (magic link abierto en un
  // browser distinto al que envió el form). Supabase no persiste `next` en
  // cookie server-side; si se necesita en el futuro, evaluar guardar `next`
  // en cookie `sb-next` desde `requestMagicLink` y leerla acá como fallback.
  return NextResponse.redirect(new URL(next, origin));
}
