# VianStore

E-commerce de venta de zapatos.

## Alcance del MVP

El MVP debe permitir que un cliente descubra un zapato en su talla, pague, y que el equipo pueda despacharlo y cobrarle. Todo lo demás es optimización posterior.

### Módulos incluidos en el MVP

**Storefront (cliente)**
- Catálogo con variantes (talla + color) y stock por SKU.
- Búsqueda y filtros básicos (talla, color, marca, precio).
- Registro / login (email + Google).
- Carrito.
- Checkout con una pasarela de pago.
- Direcciones de envío (una guardada por usuario).
- Historial de pedidos con estado (pagado / en preparación / enviado / entregado).
- Emails transaccionales (confirmación de pedido y despacho).

**Admin**
- Gestión de catálogo con variantes e inventario por SKU (un solo módulo en el MVP).
- Gestión de pedidos (ver, cambiar estado, marcar despachado con número de guía).
- Dashboard mínimo (ventas del día/mes, pedidos pendientes, stock bajo).
- Roles básicos (admin y cliente).

### Fuera del MVP (a propósito)

- Devoluciones y reclamos → se manejan manualmente por canales externos hasta tener volumen.
- Wishlist, comparador, reseñas, cupones.
- CRM, reportes avanzados, CMS, auditoría.
- Seguimiento de envíos propio (basta con guardar el número de guía y linkear a la transportadora).
- Facturación electrónica (evaluar según obligación legal del vendedor).

## Stack

- **Framework fullstack:** Next.js 16 (App Router, Turbopack) + TypeScript estricto.
- **Frontend:** React 19 + Tailwind v4.
- **Iconos:** `lucide-react` v1 (nota: v1 removió logos de marcas — no importar `Instagram` u otros brand icons).
- **Package manager:** pnpm 10.
- **Base de datos:** PostgreSQL en Supabase.
- **ORM:** Prisma 7 con `@prisma/adapter-pg` (driver adapter obligatorio en v7). URLs en `prisma.config.ts`, no en el `datasource` del schema. Multi-schema (`public` + `auth`) es GA — no hace falta preview flag.
- **Autenticación:** Supabase Auth (email magic link + Google OAuth) (llega en PR #3).
- **Storage de imágenes:** Supabase Storage (S3-compatible).
- **Email transaccional:** Resend + React Email (llega en PR #9).
- **Hosting:** Vercel.
- **Pasarela de pago:** _fuera del alcance del MVP inicial. Los pedidos quedan en estado `pendiente_pago` y se confirman manualmente._

> ⚠️ Next.js 16 tiene cambios de API respecto a Next 14/15 (ver [`AGENTS.md`](AGENTS.md)). Consultar
> `node_modules/next/dist/docs/` antes de asumir comportamiento de versiones previas.

### Convivencia Prisma + Supabase Auth

Supabase Auth gestiona su propia tabla `auth.users` (schema `auth`) que Prisma no debe modificar. La app usa una tabla `public.Profile` gestionada por Prisma, con `id UUID` que hace match con `auth.users.id`. Ahí guardamos `role` (`admin` / `customer`), nombre, teléfono, etc. El profile se crea al primer login (trigger en DB o al vuelo desde la app).

## Estructura del repositorio

```
app/                # Rutas Next.js (App Router). layout.tsx tiene el shell (header + footer).
components/         # Componentes React compartidos. Logo.tsx.
lib/                # Utilidades compartidas. prisma.ts (singleton con adapter pg).
db/                 # schema.prisma, migraciones y seed.ts.
  schema.prisma     # Modelos (Profile + enum Role). Prisma 7 → sin `url` en el datasource.
  seed.ts           # Crea/promueve admin de dev vía Supabase Admin SDK + Prisma.
  migrations/       # Migraciones versionadas. `_supplements/` contiene SQL raw
                    # (RLS, triggers, FKs a auth) que se anexa a migraciones.
prisma.config.ts    # Prisma 7 mueve las URLs aquí (DATABASE_URL pooler, DIRECT_URL para migrate).
emails/             # Plantillas React Email — llega en PR #9.
public/             # Assets estáticos servidos por Next.
vistas/             # Prototipo Vite/React original. Referencia visual; excluido del build,
                    # tsconfig y ESLint.
.claude/
  agents/           # Agentes personalizados
  skills/           # Skills personalizados
  commands/         # Slash commands del proyecto
  prs/              # Roadmap y trazabilidad de los 14 PRs del MVP
CLAUDE.md           # Este archivo — contexto para Claude Code.
AGENTS.md           # Aviso de Next 16 sobre cambios respecto a training data.
```

## Convenciones

- **Precios en centavos** (`int`) — nunca decimales, para evitar imprecisión.
- **IDs de dominio:** UUID. Los IDs de `auth.users` de Supabase se referencian por UUID.
- **Zona horaria del server:** `America/Bogota` (via env `TZ`).
- **Naming de branches** por PR del roadmap: `pr-<numero>-<slug>` (ej: `pr-01-bootstrap`).
- **Alias de imports:** `@/` apunta a la raíz. Ejemplo: `import Logo from "@/components/Logo"`.
- **Package manager:** pnpm exclusivamente. No mezclar con npm/yarn.
- **Estilo de código:** Prettier con `.prettierrc.json` (semi, double quotes, trailing comma all, 100 cols).
  Tailwind class sorting via `prettier-plugin-tailwindcss`. ESLint 9 flat config con reglas de Next.
- **Design tokens** (en `app/globals.css` bajo `@theme`):
  - `--font-sans` → Inter (via next/font).
  - `--font-display` → Outfit (via next/font).
  - `--font-mono` → JetBrains Mono (via next/font).
  - Paleta: `neutral` como base + `amber` como accent (600 principal).

## Roadmap del MVP

El plan de trabajo está desglosado en 14 PRs con estado, dependencias y definition of done. Ver [`.claude/prs/README.md`](.claude/prs/README.md).

Resumen por fases:

- **Fase 0 — Fundación:** PRs #1–#3 (bootstrap, DB, auth).
- **Fase 1 — Catálogo:** PRs #4–#6 (modelo, admin CRUD, storefront).
- **Fase 2 — Compra:** PRs #7–#9 (carrito, checkout, emails).
- **Fase 3 — Post-compra:** PRs #10–#12 (historial, gestión de pedidos, email de despacho).
- **Fase 4 — Cierre:** PRs #13–#14 (dashboard, CI/CD).

Antes de iniciar cualquier tarea, revisar el archivo del PR correspondiente en `.claude/prs/` y actualizar su campo `status`.

## Flujo de trabajo por PR (obligatorio)

Cada PR sigue este ciclo. **Ningún PR pasa directo de `in_progress` a `merged`.**

1. **`pending` → `in_progress`** — el agente asignado implementa el alcance del PR y va marcando su checklist.
2. **`in_progress` → `in_review`** — al terminar el alcance y las verificaciones locales (`pnpm lint`, `pnpm typecheck`, tests si aplica), se invoca al agente [`code-reviewer`](.claude/agents/code-reviewer.md) sobre los cambios del PR. Es una **compuerta obligatoria** antes de mergear.
3. Según el veredicto del `code-reviewer`:
   - **`APPROVE`** → status pasa a `merged`.
   - **`APPROVE WITH SUGGESTIONS`** → aplicar los ajustes en el mismo PR, volver a correr `code-reviewer` y solo entonces mergear.
   - **`BLOCK`** → devolver el PR al agente que lo implementó (o al agente que corresponda por dominio) con los findings del review. No se mergea hasta que un nuevo pase de `code-reviewer` termine en `APPROVE`.
4. **`merged`** — solo después de un veredicto `APPROVE` limpio del `code-reviewer`.

Los findings del review se resumen en el archivo del PR bajo una sección `## Code review` con el veredicto, la fecha y los cambios aplicados si los hubo.
