import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";

/**
 * Cliente de email para VianStore. **Node-only** (usa `react-dom/server` vía
 * `@react-email/components` + `pg` transitivamente). No usar desde Edge runtime.
 *
 * Ambiente / comportamiento:
 * - `RESEND_API_KEY` vacío en **dev** → log a consola en vez de enviar. Sirve
 *   para levantar `pnpm dev` sin cuenta Resend. En **producción** un API key
 *   vacío devuelve `{ ok: false, error: "email_provider_not_configured" }`
 *   para que el caller lo registre en tracking en vez de marcar como enviado.
 * - `EMAIL_DEV_REDIRECT_TO` presente → todos los envíos redirigen a esa
 *   dirección (con `[dev:<original>]` en el subject).
 * - `EMAIL_FROM` debe apuntar a un dominio verificado en Resend en prod.
 */

export type SendEmailArgs = {
  to: string;
  subject: string;
  react: ReactElement;
  /** Text alt opcional; si no viene, se deriva del HTML. */
  text?: string;
  /** Clave de idempotencia para el proveedor (24h de dedupe en Resend). */
  idempotencyKey?: string;
};

export type SendEmailResult =
  | { ok: true; id?: string; skipped?: "no_api_key" }
  | { ok: false; error: string };

const FROM = process.env.EMAIL_FROM ?? "VianStore <no-reply@vianstore.example>";

let _client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (_client) return _client;
  _client = new Resend(key);
  return _client;
}

/**
 * `foo@bar.com` → `f***@bar.com`. Evita colar la dirección completa a logs
 * de Vercel / Datadog. Mantiene el dominio para debugging.
 */
function maskEmail(addr: string): string {
  const at = addr.indexOf("@");
  if (at <= 0) return "***";
  const local = addr.slice(0, at);
  const domain = addr.slice(at);
  const head = local.slice(0, 1);
  return `${head}***${domain}`;
}

/** Normaliza subject: colapsa CR/LF/tab, cap a 200 chars. */
function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n\t]+/g, " ").slice(0, 200);
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const client = getClient();

  const devRedirect = process.env.EMAIL_DEV_REDIRECT_TO?.trim();
  const finalTo = devRedirect || args.to;
  const finalSubject = sanitizeSubject(
    devRedirect ? `[dev:${args.to}] ${args.subject}` : args.subject,
  );

  if (!client) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY missing in production");
      return { ok: false, error: "email_provider_not_configured" };
    }
    // Dev: log sin renderizar el HTML — ahorra ~100-200 ms por checkout de dev.
    console.info("[email:dev] would send", {
      to: maskEmail(finalTo),
      from: FROM,
      subject: finalSubject,
    });
    return { ok: true, skipped: "no_api_key" };
  }

  const html = await render(args.react);
  const text = args.text ?? (await render(args.react, { plainText: true }));

  try {
    const { data, error } = await client.emails.send(
      {
        from: FROM,
        to: finalTo,
        subject: finalSubject,
        html,
        text,
      },
      args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
    );
    if (error) {
      // No filtramos `to` cruda; el orderId ya identifica el registro
      // corriente arriba en la stack de llamadas.
      console.error("[email] Resend error", {
        error: error.name ?? "unknown",
        message: error.message?.slice(0, 200),
      });
      return { ok: false, error: error.name ?? error.message ?? "provider_error" };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[email] send failed", { message: message.slice(0, 200) });
    return { ok: false, error: "provider_error" };
  }
}
