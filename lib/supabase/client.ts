import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para Client Components.
 *
 * `@supabase/ssr` mantiene un singleton interno (`isSingleton: true` por
 * defecto), así que llamar `createClient()` varias veces devuelve la misma
 * instancia. Nunca importar `SUPABASE_SERVICE_ROLE_KEY` acá.
 */
export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
