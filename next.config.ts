import type { NextConfig } from "next";

// Storage de Supabase (imágenes reales cargadas por el admin). El host cambia
// por proyecto — se deriva de NEXT_PUBLIC_SUPABASE_URL. Falla temprano si la
// env no está: mejor romper el build que renderizar imágenes rotas en runtime.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for next.config.ts to resolve image host");
}
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
      // Placeholder usado en el seed hasta que haya imágenes reales.
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;
