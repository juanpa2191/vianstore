import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy raíz de VianStore (Next 16 renombró `middleware` → `proxy`).
 *
 * Responsabilidades:
 * 1. Refrescar la sesión de Supabase en cada request (patrón oficial de
 *    `@supabase/ssr`). Sin esto, el access token expira en el browser y los
 *    Server Components leen sesión stale.
 * 2. Proteger `/admin/**` requiriendo `app_metadata.role === "admin"`.
 * 3. Proteger `/account/**` requiriendo sesión válida.
 *
 * El rol se lee del JWT (`app_metadata.role`), no de una query a `Profile`,
 * para mantener el proxy sin I/O a la DB. Consistente con las policies de RLS
 * (`auth.jwt()->>role`). Un customer promovido a admin debe re-loguearse para
 * que su JWT refleje el nuevo rol — aceptable dado que la promoción es rara.
 */

const ADMIN_PREFIX = "/admin";
const ACCOUNT_PREFIX = "/account";
const CHECKOUT_PREFIX = "/checkout";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, user, role } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isAdminRoute = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
  const isAccountRoute =
    pathname === ACCOUNT_PREFIX || pathname.startsWith(`${ACCOUNT_PREFIX}/`);
  const isCheckoutRoute =
    pathname === CHECKOUT_PREFIX || pathname.startsWith(`${CHECKOUT_PREFIX}/`);

  if (!user && (isAdminRoute || isAccountRoute || isCheckoutRoute)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && role !== "admin") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    homeUrl.searchParams.set("denied", "admin");
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Correr en todo menos assets estáticos, imágenes, favicon y el callback de auth
    // (el callback maneja sus propias cookies escribiendo la sesión).
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
