"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { signInWithGoogle } from "./actions";

// lucide-react v1 removió los brand icons — usamos el SVG oficial de Google inline.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M21.35 11.1H12v3.83h5.35c-.23 1.5-1.68 4.4-5.35 4.4-3.22 0-5.85-2.66-5.85-5.94s2.63-5.94 5.85-5.94c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.63 4.94 14.53 4 12 4c-4.6 0-8.3 3.71-8.3 8.29S7.4 20.58 12 20.58c4.79 0 7.96-3.37 7.96-8.11 0-.55-.06-.96-.15-1.37z"
      />
    </svg>
  );
}

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-800 shadow-xs transition-all hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Redirigiendo…</span>
        </>
      ) : (
        <>
          <GoogleIcon />
          <span>Continuar con Google</span>
        </>
      )}
    </button>
  );
}

export default function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <GoogleSubmit />
    </form>
  );
}
