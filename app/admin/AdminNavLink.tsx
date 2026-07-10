"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  /** Match SOLO si `pathname === href` exacto. Útil para links a rutas
   *  padre (ej: `/admin` no debe marcarse activo en `/admin/products`). */
  exact?: boolean;
};

/**
 * Link de nav admin con estado activo derivado del pathname actual.
 * `disabled` para módulos placeholder.
 */
export default function AdminNavLink({
  href,
  label,
  children,
  disabled = false,
  exact = false,
}: Props) {
  const pathname = usePathname();
  const active =
    !disabled &&
    (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-neutral-300"
        title="Disponible en un PR posterior"
      >
        {children}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
