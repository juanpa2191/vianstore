"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-redirect";

export type MagicLinkState =
  { status: "idle" } | { status: "success"; email: string } | { status: "error"; message: string };

function isEmail(value: string): boolean {
  // Validación pragmática: nada de regex complicadas; Supabase valida al final.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function resolveOrigin(): Promise<string> {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, "");

  // En producción exigimos NEXT_PUBLIC_APP_URL. Aceptar el `Host` header sin
  // allowlist permite Host header injection → un atacante haría llegar el
  // magic link con `emailRedirectTo` apuntando a un dominio suyo. Supabase lo
  // rechaza contra su lista de Redirect URLs, pero mejor detener antes.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required in production. " +
        "Set it to the canonical public URL of the app (e.g. https://vianstore.example).",
    );
  }

  // Fallback dev: reconstruir desde headers del request. En dev el atacante
  // ya está en el mismo host (localhost), así que Host header injection no
  // aplica de forma útil.
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

function buildCallbackUrl(origin: string, next: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", next);
  return url.toString();
}

/**
 * Envía magic link al email. Usado desde el `<form action={...}>` del /login.
 * Retorna estado para renderizar feedback via `useActionState`.
 */
export async function requestMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const emailRaw = formData.get("email");
  const nextRaw = formData.get("next");

  if (typeof emailRaw !== "string") {
    return { status: "error", message: "Email inválido." };
  }
  const email = emailRaw.trim().toLowerCase();
  if (!isEmail(email)) {
    return { status: "error", message: "Ingresa un email válido." };
  }

  const next = safeInternalPath(typeof nextRaw === "string" ? nextRaw : null, "/");
  const origin = await resolveOrigin();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: buildCallbackUrl(origin, next),
    },
  });

  if (error) {
    console.error("[login/actions] signInWithOtp failed:", error.message);
    return { status: "error", message: "No pudimos enviar el enlace. Intenta de nuevo." };
  }

  return { status: "success", email };
}

/**
 * Arranca el flow OAuth con Google. `signInWithOAuth` con `skipBrowserRedirect`
 * no aplica acá — corremos server-side, tomamos `data.url` y redirigimos con
 * `redirect()` de Next.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const nextRaw = formData.get("next");
  const next = safeInternalPath(typeof nextRaw === "string" ? nextRaw : null, "/");
  const origin = await resolveOrigin();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildCallbackUrl(origin, next),
    },
  });

  if (error || !data?.url) {
    console.error("[login/actions] signInWithOAuth failed:", error?.message);
    redirect(`/login?error=oauth&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}
