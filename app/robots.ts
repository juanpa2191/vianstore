import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

const BASE_URL = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Los admins nunca deben indexarse; el resto sí.
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/auth", "/account"] },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    // `host` era propietario de Yandex; Google lo ignora y ya no está en spec.
  };
}
