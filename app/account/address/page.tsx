import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import AddressForm from "./AddressForm";

export const metadata = {
  title: "Dirección — VianStore",
  robots: { index: false, follow: false },
};

export default async function AddressPage() {
  const session = await requireUser();

  const address = await prisma.address.findUnique({
    where: { userId: session.userId },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Volver a mi cuenta
      </Link>
      <h1 className="mt-3 font-display text-2xl font-black tracking-tight text-neutral-900">
        Dirección de envío
      </h1>
      <p className="mt-1 text-xs text-neutral-500">
        {address
          ? "Editar los datos actualiza los envíos futuros; los pedidos ya realizados mantienen la dirección con la que se enviaron."
          : "Agrega tu dirección para poder confirmar pedidos."}
      </p>

      <AddressForm
        initial={
          address
            ? {
                fullName: address.fullName,
                phone: address.phone,
                line1: address.line1,
                line2: address.line2 ?? "",
                city: address.city,
                state: address.state,
                postalCode: address.postalCode ?? "",
                country: address.country,
              }
            : null
        }
      />
    </div>
  );
}
