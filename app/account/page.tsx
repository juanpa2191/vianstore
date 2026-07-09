import type { Metadata } from "next";
import Link from "next/link";
import { UserCircle, Package, MapPin, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Mi cuenta — VianStore",
  robots: { index: false, follow: false },
};

const CARDS = [
  {
    href: "/account/orders",
    label: "Mis pedidos",
    description: "Historial y estado de cada compra.",
    icon: Package,
  },
  {
    href: "/account/address",
    label: "Dirección de envío",
    description: "Datos para tus futuros pedidos.",
    icon: MapPin,
  },
] as const;

export default async function AccountHomePage() {
  const session = await requireUser();

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded bg-neutral-100 px-2.5 py-1 text-[10px] font-black tracking-widest text-neutral-700 uppercase">
          <UserCircle className="h-3 w-3" aria-hidden="true" />
          Área de cliente
        </span>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-neutral-900">
          Mi cuenta
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{session.email}</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400"
            >
              <c.icon
                className="h-5 w-5 shrink-0 text-neutral-500"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-900">{c.label}</p>
                <p className="text-[11px] text-neutral-500">{c.description}</p>
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-neutral-400"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
