# VianStore

E-commerce de venta de zapatos. Next.js 16 (App Router) + TypeScript + Tailwind v4 + PostgreSQL (Supabase) + Prisma.

## Requisitos

- Node.js 22.x o superior.
- pnpm 10.x.
- Cuenta en Supabase (para PR #2 en adelante).

## Setup local

```bash
pnpm install
cp .env.example .env.local
# edita .env.local con tus valores
pnpm dev
```

La app queda en `http://localhost:3000`.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo con hot reload. |
| `pnpm build` | Build de producción. |
| `pnpm start` | Sirve el build de producción (requiere `pnpm build` antes). |
| `pnpm lint` | ESLint con reglas de Next.js. |
| `pnpm typecheck` | `tsc --noEmit` sobre todo el proyecto. |
| `pnpm format` | Prettier a todos los archivos soportados. |
| `pnpm format:check` | Verifica formato sin escribir. |

## Estructura

```
app/          # Rutas Next.js (App Router)
components/   # Componentes React compartidos
lib/          # Utilidades (prisma, supabase, email — llegan en PRs siguientes)
db/           # Schema Prisma, migraciones y seeds — llega en PR #2
emails/       # Plantillas React Email — llega en PR #9
public/       # Assets estáticos
vistas/       # Prototipo Vite/React de referencia visual (excluido del build)
.claude/      # Configuración para Claude Code (agentes, skills, roadmap de PRs)
```

## Roadmap

El trabajo hacia el MVP está desglosado en 14 PRs con estado y dependencias. Ver
[`.claude/prs/README.md`](.claude/prs/README.md).

## Convenciones

- Precios en centavos (`int`) — nunca decimales.
- IDs de dominio: UUID. Los IDs de `auth.users` se referencian por UUID.
- Zona horaria del server: `America/Bogota`.
- Nombres de branches por PR del roadmap: `pr-<numero>-<slug>`.

## Nota sobre Next.js 16

Este proyecto usa Next.js 16, que trae cambios importantes vs Next 14/15. Ante duda, consulta
`node_modules/next/dist/docs/` o el archivo [`AGENTS.md`](AGENTS.md) del repo.
