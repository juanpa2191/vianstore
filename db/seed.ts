import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Copy .env.example to .env.local and fill Supabase credentials before seeding.",
  );
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@vianstore.local";
const ADMIN_FULL_NAME = "VianStore Admin";

// Password: si el operador no lo fija por env, generamos uno aleatorio y lo
// imprimimos una sola vez. Evita passwords débiles/hardcoded que se filtren
// vía el repo si el seed se corre contra una instancia compartida.
let generatedPassword = false;
const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ??
  (() => {
    generatedPassword = true;
    return randomBytes(24).toString("base64url");
  })();

// Guard defensivo: si el URL de Supabase NO parece dev/local y el operador no
// se autoexcluye explícitamente, abortar. Evita crear un admin contra prod por
// accidente.
const looksLikeDev =
  SUPABASE_URL.includes("localhost") ||
  SUPABASE_URL.includes("127.0.0.1") ||
  process.env.SEED_ALLOW_REMOTE === "1";

if (!looksLikeDev) {
  console.warn(
    `[seed] target ${SUPABASE_URL} does not look local. ` +
      "Set SEED_ALLOW_REMOTE=1 to run against a remote (dev) Supabase project.",
  );
  if (process.env.SEED_ALLOW_REMOTE !== "1") {
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertAdmin(): Promise<{ id: string; wasCreated: boolean }> {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;

  const existing = listData.users.find((u) => u.email === ADMIN_EMAIL);
  if (existing) {
    console.log(`[seed] admin already exists in auth.users → ${existing.id}`);
    return { id: existing.id, wasCreated: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_FULL_NAME },
    app_metadata: { role: "admin" },
  });
  if (error) throw error;
  if (!data.user) throw new Error("createUser returned no user");
  console.log(`[seed] admin created in auth.users → ${data.user.id}`);
  return { id: data.user.id, wasCreated: true };
}

async function main() {
  const { id: adminId, wasCreated } = await upsertAdmin();

  // El trigger AFTER INSERT ON auth.users crea la fila en public.profile
  // con role='customer'. Aquí la promovemos a admin y fijamos el full_name.
  const profile = await prisma.profile.upsert({
    where: { id: adminId },
    create: {
      id: adminId,
      role: "admin",
      fullName: ADMIN_FULL_NAME,
    },
    update: {
      role: "admin",
      fullName: ADMIN_FULL_NAME,
    },
  });

  console.log(`[seed] profile upserted → role=${profile.role} fullName=${profile.fullName}`);

  if (wasCreated && generatedPassword) {
    console.log(
      `\n[seed] GENERATED ADMIN PASSWORD (guárdalo AHORA — no se muestra otra vez):\n  ${ADMIN_PASSWORD}\n`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("[seed] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
