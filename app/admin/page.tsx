import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin — VianStore",
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
      <span className="inline-flex w-fit items-center gap-1.5 rounded bg-amber-50 px-2.5 py-1 text-[10px] font-black tracking-widest text-amber-800 uppercase">
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        Área admin
      </span>
      <h1 className="font-display text-3xl font-black tracking-tight text-neutral-900">
        Bienvenido, admin
      </h1>
      <p className="max-w-xl text-sm text-neutral-500">
        Aquí vivirá la gestión de catálogo, pedidos y dashboard. Los módulos reales llegan en los
        PRs #5, #11 y #13. Por ahora, esta ruta solo valida que el middleware bloquea a customers.
      </p>
    </section>
  );
}
