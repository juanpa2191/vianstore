import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no auto-carga .env — este módulo se ejecuta ANTES del CLI, así que
// leemos .env.local (dev) y .env (fallback) manualmente. En Vercel / prod las
// vars ya vienen del entorno y estas llamadas no sobrescriben nada.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

/**
 * Prisma 7 movió las URLs del `datasource` en `schema.prisma` a este archivo.
 *
 * - `datasource.url` (pooler, puerto 6543 + `pgbouncer=true`) lo usa el runtime
 *   de la app vía el adapter en `lib/prisma.ts`.
 * - `migrations.datasourceUrl` (directa, puerto 5432) lo usa `prisma migrate`
 *   para operaciones DDL.
 */
export default defineConfig({
  schema: path.join("db", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    path: path.join("db", "migrations"),
    seed: "tsx db/seed.ts",
    datasourceUrl: process.env.DIRECT_URL ?? "",
  },
});
