import { unauthorized } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserSession = {
  userId: string;
  email: string;
};

/**
 * Guard para páginas y Server Actions que requieren sesión (sin exigir rol
 * admin). El proxy raíz ya redirige a /login para rutas protegidas; este
 * helper es defensa en profundidad.
 */
export async function requireUser(): Promise<UserSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) unauthorized();
  return { userId: user.id, email: user.email ?? "" };
}
