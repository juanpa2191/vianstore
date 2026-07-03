import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para Server Components, Route Handlers y Server Actions.
 *
 * Debe crearse fresco por request — nunca compartir entre requests. Lee las
 * cookies via `next/headers` y las escribe cuando la librería refresca tokens.
 *
 * En Server Components puros `setAll` puede fallar (Next no permite mutar
 * cookies fuera de una Server Action o Route Handler). El try/catch es el
 * patrón oficial: el proxy refresca la sesión antes de llegar a la página, así
 * que la escritura desde el RSC es un fallback silencioso.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Fill .env.local from .env.example.",
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called desde un Server Component: el proxy ya refrescó la sesión.
        }
      },
    },
  });
}
