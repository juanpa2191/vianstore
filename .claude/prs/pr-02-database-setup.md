---
pr: 2
title: Base de datos + Prisma + Supabase
phase: 0 - Fundación
status: merged
depends_on: [1]
branch: pr-02-database-setup
---

# PR #2 — Base de datos + Prisma + Supabase

## Objetivo
Conectar el proyecto a un Postgres gestionado por Supabase y dejar Prisma configurado, migrado y con seeds mínimos.

## Alcance
- [x] Crear proyecto Supabase de **desarrollo** (guardar credenciales en `.env.local`, actualizar `.env.example`).
- [x] Prisma 7 configurado con `db/schema.prisma` + `prisma.config.ts` (Prisma 7 movió las URLs del `datasource` a este archivo).
- [x] `schema.prisma`:
  - Multi-schema (`public` + `auth`) es GA en Prisma 7 — **no** se usa `previewFeatures`.
  - `auth.users` no se modela en Prisma; la FK se añade por SQL raw en la migración inicial.
  - Modelo `Profile` con `id UUID` (PK = FK a `auth.users.id` via SQL), enum `Role` (`admin` / `customer`), `full_name`, `phone`, `created_at` + `updated_at` (`@db.Timestamptz(6)`), snake_case en DB con `@@map`/`@map`.
- [x] Variables: `DATABASE_URL` (pooler transaction mode, puerto 6543, `pgbouncer=true&connection_limit=1`) y `DIRECT_URL` (session pooler, puerto 5432 via `pooler.supabase.com` — la URL "direct" clásica `db.<ref>.supabase.co` es IPv6-only).
- [x] Migración inicial `20260703181620_init` aplicada — schema DDL + FK a `auth.users` + RLS con 4 policies + trigger `on_auth_user_created` que auto-crea el `Profile` con `role='customer'`.
- [x] Cliente Prisma singleton en `lib/prisma.ts` con `@prisma/adapter-pg` (obligatorio en Prisma 7).
- [x] Script `db/seed.ts` que crea admin en `auth.users` vía Supabase Admin SDK, promueve el `Profile` a `admin`, es idempotente, y genera password aleatorio si `SEED_ADMIN_PASSWORD` no viene por env. Guardado defensivo `SEED_ALLOW_REMOTE=1` para evitar corrida accidental contra prod.
- [x] API route `/api/health/db` de smoke test (`export const dynamic = "force-dynamic"`, 404 en prod, sin PII en `sample`).
- [x] Scripts en `package.json`: `prisma`, `prisma:generate`, `prisma:studio`, `db:migrate`, `db:migrate:deploy`, `db:reset`, `db:seed`, `postinstall: prisma generate`.

## Definition of Done
- [x] Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- [x] Migración corre limpio contra Supabase (Postgres 17.6). Verificado por query directa a `information_schema`: `profile` con tipos correctos, enum `Role`, FK con `ON DELETE CASCADE`, RLS habilitado, 4 policies, trigger armado.
- [x] `pnpm db:seed` idempotente — re-run reporta `already exists` sin errores.
- [x] `curl /api/health/db` → HTTP 200 con `{"ok":true,"profileCount":1,"sample":[{...role:"admin"}]}`.
- [x] `pnpm typecheck` y `pnpm lint` limpios.

## Notas técnicas
- **Prisma 7 vs Supabase — `migrate dev` bloqueado**: `prisma migrate dev` (y `--create-only`) queda colgado al intentar crear la shadow database vía el pooler. Solución adoptada: `prisma migrate diff --from-empty --to-schema` genera el DDL sin conectarse a la DB, se anexa el suplemento SQL, y se aplica manualmente con `pg` contra `DIRECT_URL`. La migración queda registrada en `_prisma_migrations` con checksum SHA-256, así que futuros `prisma migrate deploy` la reconocen como aplicada.
- **`db/migrations/_supplements/`**: contiene el SQL raw (RLS + trigger + FK a `auth`) como source of truth. Se anexa al `migration.sql` generado por Prisma. `prisma db pull` destruye los triggers → nunca correrlo sin re-aplicar el suplemento.
- **Enum `Role` — evolución futura**: `ALTER TYPE ADD VALUE` no puede correr dentro de transacción. Cuando lleguen `staff`/`warehouse`, la migración debe empezar con `-- Prisma: disable-transaction`.
- **Supabase 2025**: la API key pública pasó del formato JWT anon (`eyJ...`) al nuevo `sb_publishable_*`. `.env.example` documenta ambos.

## Code review

**Fecha:** 2026-07-02
**Agente:** [`code-reviewer`](../agents/code-reviewer.md)
**Veredicto final:** `APPROVE` (tras aplicar HIGH + MEDIUM del primer pase).
**Primer pase:** `APPROVE WITH SUGGESTIONS` — 10 archivos revisados. 0 CRITICAL · 1 HIGH · 2 MEDIUM · 3 LOW.
**Fixes aplicados en el mismo PR:**
- HIGH (`db/seed.ts`): password hardcoded `vianstore-dev-admin` eliminado. Fallback: `randomBytes(24).toString("base64url")` con guardado defensivo `SEED_ALLOW_REMOTE=1` para no correr contra URLs no-locales por accidente. Password generado solo se imprime cuando el admin fue realmente creado (no en re-runs).
- MEDIUM (`lib/prisma.ts`): ternary `log` con ambas ramas idénticas colapsado a `log: ["warn", "error"]`.
- MEDIUM (`app/api/health/db/route.ts`): removido `fullName` del `sample` (PII), añadidos `export const dynamic = "force-dynamic"` + `export const revalidate = 0` para asegurar que Next 16 no cachea la respuesta.

**Segundo pase:** `APPROVE` — 3 fixes verificados, sin regresiones. `pnpm typecheck`, `pnpm lint` y `pnpm db:seed` limpios post-fix.
**Deferidos (registrados para trabajarse al tocar el archivo relacionado):**
- LOW (`prisma.config.ts`): silent fallback a empty string en `DATABASE_URL`/`DIRECT_URL` cuando faltan las envs — mejor throw explícito.
- LOW (`migration.sql:38`): nota sobre `ALTER TYPE ADD VALUE` vive en la migración inicial; movible a `CLAUDE.md` o a `db/migrations/_supplements/README.md` para ser discoverable.
- LOW (`db/migrations/_supplements/init_rls_and_trigger.sql`): duplica el bloque anexado en `migration.sql` — falta declarar cuál es source of truth.
