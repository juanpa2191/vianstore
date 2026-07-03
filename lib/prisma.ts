import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma singleton para VianStore.
 *
 * Prisma 7 requiere un driver adapter en el constructor. Usamos `PrismaPg`
 * apuntando al pooler PgBouncer de Supabase (`DATABASE_URL`, puerto 6543).
 * Las migraciones usan una connection distinta (`DIRECT_URL`, puerto 5432)
 * y se configuran en `prisma.config.ts`.
 *
 * En dev guardamos la instancia en `globalThis` para evitar reconexiones al
 * hot-reload de Next.js.
 */
declare global {
  var prismaClient: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL. Copy .env.example to .env.local and fill the Supabase pooler URL.",
    );
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });
}

export const prisma = globalThis.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = prisma;
}
