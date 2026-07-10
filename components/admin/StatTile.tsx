import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StatTileProps = {
  label: string;
  value: string;
  /** Sub-línea de contexto (ej: "12 pedidos"). Usa `text-secondary`, no color del dato. */
  hint?: string;
  /** Ícono decorativo en la esquina — no aporta información. */
  icon?: LucideIcon;
  /** Href destino cuando el tile es clicable. */
  href?: string;
  /** Texto del CTA (default: "Ver detalle"). */
  ctaLabel?: string;
  /** Tono de acento para el valor. Default: `neutral` (color de texto primario). */
  tone?: "neutral" | "amber" | "emerald" | "red";
};

const TONE_CLASS: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "text-neutral-900",
  amber: "text-amber-700",
  emerald: "text-emerald-700",
  red: "text-red-600",
};

/**
 * Stat tile: label + value + hint. Sigue el contrato de `dataviz`:
 *   - value en semibold sans, auto-compact NO — el admin necesita precisión (COP).
 *   - label sentence case, sin dos puntos.
 *   - text usa tokens (`text-neutral`); el mark de identidad es el ícono a la
 *     derecha, no el color del texto (excepto el `tone` para estados críticos).
 */
export default function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  href,
  ctaLabel = "Ver detalle",
  tone = "neutral",
}: StatTileProps) {
  const content = (
    <div className="flex h-full flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-400">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
          {label}
        </p>
        {Icon && (
          <Icon
            className="h-4 w-4 shrink-0 text-neutral-400"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-3">
        <p
          className={`font-display text-3xl font-black tracking-tight tabular-nums ${TONE_CLASS[tone]}`}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      </div>
      {href && (
        <p className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700">
          {ctaLabel}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}
