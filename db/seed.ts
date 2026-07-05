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

// ---------------------------------------------------------------------------
// Catálogo (PR #4).
//
// Semillas idempotentes: upsert por identificador natural (slug / name / label
// / code). Reejecuciones no duplican; tampoco pisan cambios manuales al SKU.
// ---------------------------------------------------------------------------

const BRANDS = [
  { slug: "nike", name: "Nike", code: "NIK" },
  { slug: "adidas", name: "Adidas", code: "ADI" },
  { slug: "puma", name: "Puma", code: "PUM" },
] as const;

const COLORS = [
  { name: "Negro", hex: "111111", code: "BLK" },
  { name: "Blanco", hex: "f5f5f5", code: "WHT" },
  { name: "Rojo", hex: "dc2626", code: "RED" },
  { name: "Azul", hex: "2563eb", code: "BLU" },
  { name: "Verde", hex: "16a34a", code: "GRN" },
  { name: "Gris", hex: "6b7280", code: "GRY" },
] as const;

// Labels string a propósito — la Size.label soporta "38.5" o "M" sin cambios.
const SIZES = ["35", "36", "37", "38", "39", "40", "41", "42"] as const;

type ProductSeed = {
  slug: string;
  name: string;
  code: string; // fragmento SKU (ej "AF1")
  brandSlug: (typeof BRANDS)[number]["slug"];
  description: string;
  priceCents: number; // aplica a todas las variantes del producto
  colorCodes: readonly (typeof COLORS)[number]["code"][];
  imageBaseUrl: string; // URL genérica por producto para la imagen principal
};

// Precios en centavos (COP). 45000000 = 450.000 COP.
const PRODUCTS: readonly ProductSeed[] = [
  {
    slug: "nike-air-force-1-low",
    name: "Nike Air Force 1 Low",
    code: "AF1",
    brandSlug: "nike",
    description: "Clásico atemporal en cuero, silueta baja y suela Air.",
    priceCents: 55000000,
    colorCodes: ["WHT", "BLK", "RED"],
    imageBaseUrl: "https://placehold.co/800x800/f5f5f5/111111.png?text=AF1",
  },
  {
    slug: "nike-cortez",
    name: "Nike Cortez",
    code: "CTZ",
    brandSlug: "nike",
    description: "Silueta running icónica de los 70, en cuero y nylon.",
    priceCents: 42000000,
    colorCodes: ["WHT", "BLU"],
    imageBaseUrl: "https://placehold.co/800x800/f5f5f5/2563eb.png?text=Cortez",
  },
  {
    slug: "adidas-samba-og",
    name: "Adidas Samba OG",
    code: "SMB",
    brandSlug: "adidas",
    description: "Cuero premium, suela de goma T-shape, herencia futbolera.",
    priceCents: 49000000,
    colorCodes: ["BLK", "WHT"],
    imageBaseUrl: "https://placehold.co/800x800/111111/f5f5f5.png?text=Samba",
  },
  {
    slug: "adidas-stan-smith",
    name: "Adidas Stan Smith",
    code: "STN",
    brandSlug: "adidas",
    description: "Blanco perforado con detalle en talón. Un ícono minimalista.",
    priceCents: 46000000,
    colorCodes: ["WHT", "GRN"],
    imageBaseUrl: "https://placehold.co/800x800/f5f5f5/16a34a.png?text=Stan+Smith",
  },
  {
    slug: "puma-suede-classic",
    name: "Puma Suede Classic",
    code: "SDE",
    brandSlug: "puma",
    description: "Gamuza premium con forma que atravesó décadas de streetwear.",
    priceCents: 38000000,
    colorCodes: ["RED", "BLK", "BLU"],
    imageBaseUrl: "https://placehold.co/800x800/dc2626/f5f5f5.png?text=Suede",
  },
  {
    slug: "puma-rs-x",
    name: "Puma RS-X",
    code: "RSX",
    brandSlug: "puma",
    description: "Chunky sneaker con tecnología Running System reinterpretada.",
    priceCents: 52000000,
    colorCodes: ["WHT", "GRY"],
    imageBaseUrl: "https://placehold.co/800x800/6b7280/f5f5f5.png?text=RS-X",
  },
];

async function seedBrands(): Promise<Map<string, { id: string; code: string }>> {
  const map = new Map<string, { id: string; code: string }>();
  for (const b of BRANDS) {
    const row = await prisma.brand.upsert({
      where: { slug: b.slug },
      create: { slug: b.slug, name: b.name },
      update: { name: b.name },
      select: { id: true },
    });
    map.set(b.slug, { id: row.id, code: b.code });
  }
  console.log(`[seed] brands: ${map.size} upserted`);
  return map;
}

async function seedColors(): Promise<Map<string, { id: string; code: string }>> {
  const map = new Map<string, { id: string; code: string }>();
  for (const c of COLORS) {
    const row = await prisma.color.upsert({
      where: { name: c.name },
      create: { name: c.name, hex: c.hex },
      update: { hex: c.hex },
      select: { id: true },
    });
    map.set(c.code, { id: row.id, code: c.code });
  }
  console.log(`[seed] colors: ${map.size} upserted`);
  return map;
}

async function seedSizes(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const [i, label] of SIZES.entries()) {
    const row = await prisma.size.upsert({
      where: { label },
      create: { label, sortOrder: i },
      update: { sortOrder: i },
      select: { id: true },
    });
    map.set(label, row.id);
  }
  console.log(`[seed] sizes: ${map.size} upserted`);
  return map;
}

// Stock pseudo-realista sesgado a las tallas centrales (38-40).
function stockForSize(sizeLabel: string): number {
  const n = Number(sizeLabel);
  if (Number.isNaN(n)) return 5;
  if (n <= 36) return 3;
  if (n <= 37) return 6;
  if (n <= 40) return 12;
  if (n <= 41) return 8;
  return 4;
}

async function seedProducts(
  brands: Map<string, { id: string; code: string }>,
  colors: Map<string, { id: string; code: string }>,
  sizes: Map<string, string>,
): Promise<void> {
  let productsCreated = 0;
  let variantsCreated = 0;
  let skusCreated = 0;
  let imagesCreated = 0;

  for (const p of PRODUCTS) {
    const brand = brands.get(p.brandSlug);
    if (!brand) throw new Error(`brand ${p.brandSlug} missing`);

    // Transacción por producto: si algo falla en medio, no queda un product/
    // variante/imagen huérfana sin su contraparte. El seed sigue idempotente
    // en la próxima corrida.
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.product.findUnique({
        where: { slug: p.slug },
        select: { id: true },
      });

      const product = await tx.product.upsert({
        where: { slug: p.slug },
        create: {
          slug: p.slug,
          name: p.name,
          description: p.description,
          status: "active",
          brandId: brand.id,
        },
        update: {
          name: p.name,
          description: p.description,
          brandId: brand.id,
        },
        select: { id: true },
      });
      const productIsNew = before === null;

      const beforeImage = await tx.productImage.findUnique({
        where: {
          productId_url: { productId: product.id, url: p.imageBaseUrl },
        },
        select: { id: true },
      });

      await tx.productImage.upsert({
        where: {
          productId_url: { productId: product.id, url: p.imageBaseUrl },
        },
        create: { productId: product.id, url: p.imageBaseUrl, sortOrder: 0 },
        update: {},
        select: { id: true },
      });
      const imageIsNew = beforeImage === null;

      let newVariants = 0;
      let newSkus = 0;

      for (const colorCode of p.colorCodes) {
        const color = colors.get(colorCode);
        if (!color) throw new Error(`color ${colorCode} missing`);

        for (const sizeLabel of SIZES) {
          const sizeId = sizes.get(sizeLabel);
          if (!sizeId) throw new Error(`size ${sizeLabel} missing`);

          const existingVariant = await tx.variant.findUnique({
            where: {
              variant_product_color_size_uniq: {
                productId: product.id,
                colorId: color.id,
                sizeId,
              },
            },
            select: { id: true, sku: { select: { id: true } } },
          });

          const variantId = existingVariant
            ? existingVariant.id
            : (
                await tx.variant.create({
                  data: { productId: product.id, colorId: color.id, sizeId },
                  select: { id: true },
                })
              ).id;
          if (!existingVariant) newVariants++;

          if (!existingVariant?.sku) {
            const skuCode = `${brand.code}-${p.code}-${color.code}-${sizeLabel}`;
            await tx.sku.create({
              data: {
                variantId,
                code: skuCode,
                price: p.priceCents,
                stock: stockForSize(sizeLabel),
              },
            });
            newSkus++;
          }
          // Re-runs: no pisamos code / price / stock del SKU. Cambios manuales
          // sobreviven a re-corridas del seed.
        }
      }

      return { productIsNew, imageIsNew, newVariants, newSkus };
    }, {
      // 3 colores × 8 tallas = 24 variantes + 24 SKUs por producto. En una
      // conexión con latencia (pooler regional) el default de 5s se queda
      // corto. 30s es holgado y solo aplica al seed.
      timeout: 30_000,
      maxWait: 5_000,
    });

    if (result.productIsNew) productsCreated++;
    if (result.imageIsNew) imagesCreated++;
    variantsCreated += result.newVariants;
    skusCreated += result.newSkus;
  }

  console.log(
    `[seed] catalog (new only): ${productsCreated} products, ` +
      `${variantsCreated} variants, ${skusCreated} skus, ${imagesCreated} images`,
  );
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

  const brands = await seedBrands();
  const colors = await seedColors();
  const sizes = await seedSizes();
  await seedProducts(brands, colors, sizes);

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
