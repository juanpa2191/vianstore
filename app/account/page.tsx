import type { Metadata } from "next";
import { UserCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Mi cuenta — VianStore",
  robots: { index: false, follow: false },
};

export default function AccountHomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
      <span className="inline-flex w-fit items-center gap-1.5 rounded bg-neutral-100 px-2.5 py-1 text-[10px] font-black tracking-widest text-neutral-700 uppercase">
        <UserCircle className="h-3 w-3" aria-hidden="true" />
        Área de cliente
      </span>
      <h1 className="font-display text-3xl font-black tracking-tight text-neutral-900">
        Mi cuenta
      </h1>
      <p className="max-w-xl text-sm text-neutral-500">
        Historial de pedidos, direcciones y datos personales llegan en el PR #10. Por ahora esta
        ruta solo confirma que tienes sesión activa.
      </p>
    </section>
  );
}
