import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Forzamos runtime dinámico + no-cache: es un smoke test, la respuesta debe
// reflejar el estado real de la DB en cada request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Smoke test de conectividad Prisma ↔ Supabase.
 * Solo se expone en dev: en prod devuelve 404 para no filtrar detalles de infra.
 *
 * GET /api/health/db → { ok: true, profileCount: N, sample: [...] }
 *
 * `sample` NO incluye PII (nombre / email / phone) — solo id, rol y fecha.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const profileCount = await prisma.profile.count();
    const sample = await prisma.profile.findMany({
      take: 5,
      select: { id: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, profileCount, sample });
  } catch (error) {
    console.error("[health/db] Prisma query failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
