---
pr: 2
title: Base de datos + Prisma + Supabase
phase: 0 - Fundación
status: pending
depends_on: [1]
branch: pr-02-database-setup
---

# PR #2 — Base de datos + Prisma + Supabase

## Objetivo
Conectar el proyecto a un Postgres gestionado por Supabase y dejar Prisma configurado, migrado y con seeds mínimos.

## Alcance
- [ ] Crear proyecto Supabase de **desarrollo** (guardar credenciales en `.env.local`, actualizar `.env.example`).
- [ ] `prisma init` con datasource Postgres.
- [ ] `schema.prisma`:
  - `previewFeatures = ["multiSchema"]` para poder referenciar `auth.users` sin gestionarlo.
  - `schemas = ["public", "auth"]`.
  - Modelo `Profile` con `id UUID` (PK = FK a `auth.users.id`), `role` enum (`admin`, `customer`), `full_name`, `phone`, `created_at`.
- [ ] Variables: `DATABASE_URL` (pooler, para runtime) y `DIRECT_URL` (directa, para migraciones).
- [ ] Primera migración `init`.
- [ ] Script `db/seed.ts` que crea un usuario admin de prueba (crea la fila en `auth.users` vía Supabase SDK y el `Profile` correspondiente).
- [ ] Cliente Prisma singleton en `lib/prisma.ts` (evita reconexiones en dev).

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- `pnpm prisma migrate dev` corre limpio.
- `pnpm db:seed` crea el admin y no falla al re-ejecutarse (idempotente).
- Se puede consultar `prisma.profile.findMany()` desde una API route de prueba.

## Notas técnicas
- Supabase da la URL con pooler (puerto 6543) — usarla como `DATABASE_URL`.
- La URL directa (puerto 5432) va como `DIRECT_URL` sólo para `prisma migrate`.
- Row Level Security (RLS) queda desactivado por defecto en tablas de Prisma; lo evaluamos si necesitamos exponer la DB directo al cliente (no es el plan actual).
