import { forbidden, unauthorized } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  userId: string;
  email: string;
};

/**
 * Defensa en profundidad para páginas y Server Actions bajo `/admin/**`.
 *
 * El proxy raíz (`proxy.ts`) ya redirige a `/login` si no hay sesión y a `/`
 * con `?denied=admin` si el rol no es admin. Este helper repite el chequeo en
 * el server-side: si el proxy cae por bug o alguien llama a una Server Action
 * saltándose la ruta, la escritura no procede.
 *
 * Devuelve el userId + email para logging / auditoría. Usa `unauthorized()` /
 * `forbidden()` de Next 16 en vez de redirect manual — el framework renderiza
 * las páginas correspondientes y evita open-redirect.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) unauthorized();
  if (user.app_metadata?.role !== "admin") forbidden();
  // Requerimos email para auditoría (`OrderStatusChange.changedByEmail`).
  // Un admin sin email es un edge (Supabase phone-only) — bloquear en vez
  // de persistir strings vacíos que rompen la trazabilidad.
  if (!user.email) {
    console.error("[requireAdmin] admin sin email", { userId: user.id });
    forbidden();
  }

  return { userId: user.id, email: user.email };
}
