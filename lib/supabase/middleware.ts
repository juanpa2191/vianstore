import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

/**
 * Rol resuelto desde el JWT del usuario.
 *
 * El rol vive en `user.app_metadata.role` (escribible solo con service_role,
 * por eso no se puede falsificar desde el browser). Los customers no traen
 * `role` en `app_metadata` — se tratan como `customer` por default.
 */
export type UserRole = "admin" | "customer";

export interface SessionContext {
  response: NextResponse;
  user: User | null;
  role: UserRole;
}

function readRole(user: User | null): UserRole {
  const raw = user?.app_metadata?.role;
  return raw === "admin" ? "admin" : "customer";
}

/**
 * Crea un cliente Supabase enlazado al request/response del proxy y lo usa
 * para refrescar la sesión (patrón oficial de `@supabase/ssr`).
 *
 * Devuelve el `NextResponse` que debe retornarse — ya trae los `Set-Cookie`
 * si el access token fue rotado. Además devuelve el `user` verificado (via
 * `getUser`, que valida con el servidor de Auth) y el rol resuelto desde el
 * JWT para que el proxy raíz decida a dónde redirigir.
 */
export async function updateSession(request: NextRequest): Promise<SessionContext> {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Falla explícita en dev para que se note; en prod el build ya fallaría al leer envs.
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in proxy runtime.",
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Reescribir cookies tanto en el request (para SSR downstream) como en
        // el response (para que el browser las persista).
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // `getUser` valida el JWT contra Auth; no confiar en `getSession` para autz.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user, role: readRole(user) };
}
