import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-redirect";
import MagicLinkForm from "./MagicLinkForm";
import GoogleButton from "./GoogleButton";

export const metadata: Metadata = {
  title: "Iniciar sesión — VianStore",
  description: "Ingresa a tu cuenta VianStore con enlace mágico o Google.",
};

type SearchParams = Promise<{ next?: string; error?: string; denied?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeInternalPath(params.next, "/");

  // Si ya hay sesión, no tiene sentido mostrar el login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(next);
  }

  const oauthError = params.error === "oauth";

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-14 sm:px-6">
      <div className="space-y-2 text-center">
        <span className="inline-block rounded bg-amber-50 px-2.5 py-1 text-[10px] font-black tracking-widest text-amber-800 uppercase">
          Área de clientes
        </span>
        <h1 className="font-display text-3xl font-black tracking-tight text-neutral-900">
          Ingresa a tu cuenta
        </h1>
        <p className="text-sm text-neutral-500">
          Te enviamos un enlace de acceso por correo o puedes entrar con Google.
        </p>
      </div>

      {oauthError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>No pudimos iniciar el flujo con Google. Intenta de nuevo o usa magic link.</span>
        </div>
      ) : null}

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
        <MagicLinkForm next={next} />

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-neutral-200" />
          <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">
            o
          </span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <GoogleButton next={next} />
      </div>

      <p className="text-center text-[11px] text-neutral-500">
        ¿Necesitas ayuda? Escríbenos por{" "}
        <Link
          href="/"
          className="font-semibold text-neutral-700 underline-offset-2 hover:underline"
        >
          Instagram
        </Link>
        .
      </p>
    </section>
  );
}
