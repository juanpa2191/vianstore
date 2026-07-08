import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma / verificación de la cookie del carrito anónimo.
 *
 * Formato: `<cartId>.<base64url(hmac_sha256(secret, cartId))>`.
 * El `cartId` es un UUID v4 generado por Postgres (`gen_random_uuid()`).
 * El HMAC evita que un attacker con acceso a la cookie de otra persona (XSS,
 * Wi-Fi público) modifique el `cartId` a mano y "hijaquee" otro cart.
 *
 * Nota: NO es cifrado. El cartId sigue siendo legible desde la cookie —
 * lo que impedimos es que sea manipulable sin conocer el secret.
 */

// __Host- prefix en producción: obliga a `Secure`, sin `Domain`, con `Path=/`.
// Bloquea que un subdominio de vercel.app fije la cookie del dominio padre.
// En dev (http localhost) el prefijo no aplica porque requiere Secure.
const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-vs_cart" : "vs_cart";
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 60; // 60 días.

function getSecret(): string {
  const s = process.env.CART_COOKIE_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "CART_COOKIE_SECRET missing or too short (>=32 chars). Set it in .env.local.",
    );
  }
  return s;
}

function sign(cartId: string): string {
  const mac = createHmac("sha256", getSecret()).update(cartId).digest();
  return mac.toString("base64url");
}

export function encodeCartCookie(cartId: string): string {
  return `${cartId}.${sign(cartId)}`;
}

export function decodeCartCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.indexOf(".");
  if (idx <= 0 || idx === raw.length - 1) return null;

  const cartId = raw.slice(0, idx);
  const providedMacB64 = raw.slice(idx + 1);

  // Regex UUID estricta antes de gastar el HMAC.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cartId)
  ) {
    return null;
  }

  const expected = createHmac("sha256", getSecret()).update(cartId).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(providedMacB64, "base64url");
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  // `timingSafeEqual` evita ataques de timing sobre la comparación.
  return timingSafeEqual(provided, expected) ? cartId : null;
}

export const CART_COOKIE_NAME = COOKIE_NAME;
export const CART_COOKIE_MAX_AGE_S = COOKIE_MAX_AGE_S;
