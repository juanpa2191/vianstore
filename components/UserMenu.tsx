import Link from "next/link";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import UserMenuDropdown from "./UserMenuDropdown";

/**
 * Menu de usuario para el header.
 *
 * Server Component: lee la sesión de las cookies via `lib/supabase/server`.
 * El rol se resuelve leyendo `app_metadata.role` (consistente con el proxy y
 * las policies de RLS). Si no hay sesión, renderiza el botón "Iniciar sesión".
 */
export default async function UserMenu() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-800 shadow-xs transition-all hover:border-neutral-400 hover:bg-neutral-50"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-bold">Iniciar sesión</span>
      </Link>
    );
  }

  const isAdmin = user.app_metadata?.role === "admin";
  const rawName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Usuario";
  const email = user.email ?? "";
  const initial = rawName.trim().charAt(0).toUpperCase() || "U";

  return (
    <UserMenuDropdown initial={initial} displayName={rawName} email={email} isAdmin={isAdmin} />
  );
}
