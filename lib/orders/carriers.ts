/**
 * Mapa de transportadoras soportadas → nombre display + función que construye
 * la URL de rastreo pública. El slug es el valor que se persiste en
 * `Order.trackingCarrier`; el admin lo elige en PR #11.
 *
 * Las URLs de tracking son links directos con el número de guía como query
 * string — ninguna transportadora colombiana requiere autenticación para
 * rastrear.
 */

export type CarrierSlug =
  | "servientrega"
  | "coordinadora"
  | "envia"
  | "interrapidisimo"
  | "otro";

export type CarrierInfo = {
  slug: CarrierSlug;
  name: string;
  /** null para "otro" — el admin escribió otra sin URL de rastreo definida. */
  trackingUrl: ((code: string) => string) | null;
};

const CARRIERS: Record<CarrierSlug, CarrierInfo> = {
  servientrega: {
    slug: "servientrega",
    name: "Servientrega",
    trackingUrl: (code) =>
      `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${encodeURIComponent(code)}`,
  },
  coordinadora: {
    slug: "coordinadora",
    name: "Coordinadora",
    trackingUrl: (code) =>
      `https://coordinadora.com/rastreo?guia=${encodeURIComponent(code)}`,
  },
  envia: {
    slug: "envia",
    name: "Envía",
    trackingUrl: (code) => `https://envia.com/rastreo/${encodeURIComponent(code)}`,
  },
  interrapidisimo: {
    slug: "interrapidisimo",
    name: "Interrapidísimo",
    trackingUrl: (code) =>
      `https://interrapidisimo.com/sigue-tu-envio?guia=${encodeURIComponent(code)}`,
  },
  otro: {
    slug: "otro",
    name: "Otra transportadora",
    trackingUrl: null,
  },
};

export function getCarrierInfo(slug: string | null | undefined): CarrierInfo | null {
  if (!slug) return null;
  if (slug in CARRIERS) return CARRIERS[slug as CarrierSlug];
  return null;
}

export const CARRIER_OPTIONS = Object.values(CARRIERS);
