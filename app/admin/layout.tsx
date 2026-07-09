import { Boxes, Package, LayoutDashboard, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import AdminNavLink from "./AdminNavLink";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 rounded bg-amber-50 px-2.5 py-1 text-[10px] font-black tracking-widest text-amber-800 uppercase">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Área admin
        </span>
        <span className="text-xs text-neutral-500">{session.email}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-2 md:flex-col">
          <AdminNavLink href="/admin/products" label="Productos">
            <Package className="h-4 w-4" aria-hidden="true" />
          </AdminNavLink>
          <AdminNavLink href="/admin/orders" label="Pedidos">
            <Boxes className="h-4 w-4" aria-hidden="true" />
          </AdminNavLink>
          <AdminNavLink href="/admin/dashboard" label="Dashboard" disabled>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          </AdminNavLink>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Admin — VianStore",
  robots: { index: false, follow: false },
};
