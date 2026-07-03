"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";

interface UserMenuDropdownProps {
  initial: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
}

export default function UserMenuDropdown({
  initial,
  displayName,
  email,
  isAdmin,
}: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar en click fuera o ESC — accesibilidad básica de menú.
  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${displayName}`}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1.5 pr-2.5 text-neutral-800 transition-all hover:border-neutral-400 hover:bg-neutral-50"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-[11px] font-black text-white uppercase"
        >
          {initial}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute top-full right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg"
        >
          <div className="border-b border-neutral-100 px-3.5 py-3">
            <p className="truncate text-xs font-black text-neutral-900">{displayName}</p>
            <p className="truncate text-[11px] text-neutral-500">{email}</p>
          </div>

          <div className="flex flex-col p-1.5">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
            >
              <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Mi cuenta</span>
            </Link>

            {isAdmin ? (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-50"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Admin</span>
              </Link>
            ) : null}

            <form action="/auth/signout" method="POST" className="contents">
              <button
                type="submit"
                role="menuitem"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
