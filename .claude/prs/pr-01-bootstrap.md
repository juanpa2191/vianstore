---
pr: 1
title: Bootstrap del proyecto
phase: 0 - Fundación
status: merged
depends_on: []
branch: pr-01-bootstrap
---

# PR #1 — Bootstrap del proyecto

## Objetivo
Base ejecutable del proyecto Next.js con TypeScript, Tailwind y linters. Deja el terreno listo para que todos los PRs siguientes tengan un punto de partida consistente.

## Alcance
- [x] Next.js **16** con App Router + TypeScript estricto (create-next-app con `--empty`).
- [x] Tailwind v4 con design tokens portados de `vistas/` (fuentes Inter/Outfit/JetBrains Mono via `next/font`, paleta neutral + amber).
- [x] ESLint 9 flat config + Prettier + `.editorconfig`. Prettier con plugin de Tailwind.
- [x] Estructura de carpetas inicial: `app/`, `components/`. Lib/db/emails llegarán en sus PRs.
- [x] Alias `@/` configurado en `tsconfig.json`.
- [x] `.env.example` con placeholders para todas las variables que aparecerán en PRs siguientes (Supabase, Prisma, Resend, TZ).
- [x] `README.md` con pasos de setup local.
- [x] Scripts en `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`.
- [x] Actualizar `CLAUDE.md` con estructura y convenciones definidas.
- [x] Componente `Logo` portado desde la plantilla.
- [x] Layout shell (header sticky + footer) inspirado en `vistas/App.tsx`, sin el toggle dual-role.
- [x] Home con hero de la plantilla + card placeholder que apunta al roadmap.
- [x] Excluir `vistas/` de TypeScript, ESLint y Prettier.

## Definition of Done
- [x] `pnpm dev` arranca sin errores y sirve la home (verificado con curl → HTTP 200, markers "VIANSTORE SNEAKERS", "Colección Exclusiva 2026", "En construcción", "@vianstore14" presentes en el HTML SSR).
- [x] `pnpm lint` limpio.
- [x] `pnpm typecheck` limpio.
- [x] `.gitignore` ignora `.env*` pero permite `.env.example`.

## Notas técnicas
- Package manager: **pnpm 10** exclusivamente.
- Node 24.10 en dev (mínimo 22.x).
- Next.js 16 trae AGENTS.md advirtiendo cambios respecto a training data.
- `lucide-react` v1 removió iconos de marca (`Instagram`, etc.) — el ícono social se reemplazó con `AtSign`.
- Estructura del scaffold: se generó en carpeta temporal `vianstore-scaffold` porque npm no acepta capitales en `name`; se movió a la raíz y se cambió `name` a `vianstore` en `package.json`.

## Code review

**Fecha:** 2026-07-02 (retroactivo — el PR se cerró antes de existir la regla de merge por `code-reviewer`).
**Agente:** [`code-reviewer`](../agents/code-reviewer.md)
**Veredicto final:** `APPROVE` (tras aplicar HIGH + MEDIUM del primer pase).
**Primer pase:** `APPROVE WITH SUGGESTIONS` — 15 archivos revisados. 0 CRITICAL · 1 HIGH · 2 MEDIUM · 3 LOW · 2 SUGGESTION.
**Fixes aplicados en el mismo PR:**
- HIGH: agregado `"packageManager": "pnpm@10.33.2"` + `"engines": { "node": ">=22" }` en `package.json`.
- MEDIUM: removida la línea `/vistas` de `.gitignore` (el prototipo va versionado por decisión de `CLAUDE.md`).
- MEDIUM: `border-neutral-150/80` → `border-neutral-200/80` en `app/layout.tsx:22`.

**Segundo pase:** `APPROVE` — 3 fixes verificados, sin regresiones. `pnpm typecheck` y `pnpm lint` limpios post-fix.
**Deferidos (registrados para trabajarse al tocar el archivo relacionado):** 3 LOW + 2 SUGGESTION del primer pase.

Findings:

| Sev | Ubicación | Riesgo | Fix |
|---|---|---|---|
| HIGH | `package.json` | No declara `packageManager`; contradice la convención pnpm-only del proyecto. Un dev / Vercel podría resolver con npm/yarn. | Agregar `"packageManager": "pnpm@10.x.y"`. |
| MEDIUM | `.gitignore:43` | Ignora `/vistas`, pero `CLAUDE.md` declara `vistas/` como referencia visual versionada. | Remover `/vistas` del `.gitignore`. |
| MEDIUM | `app/layout.tsx:22` | `border-neutral-150/80` no existe en la paleta default de Tailwind v4 — borde queda transparente. | Cambiar a `border-neutral-200/80` o registrar `--color-neutral-150` en `@theme`. |
| LOW | `app/layout.tsx:36-55` | Los 3 links del nav apuntan a `/` con "Catálogo" en estado activo permanente. Confuso para a11y. | Marcar los pendientes con `aria-disabled` hasta PR #6 o agregar `aria-current="page"` al activo. |
| LOW | `app/globals.css:9-13` | Colores del `body` hardcodeados por fuera del sistema `@theme`. | Definir `--color-background` / `--color-foreground` en `@theme`. |
| LOW | `components/Logo.tsx:26` | `style={{ backgroundImage: ... }}` bypassa Tailwind. | Reemplazar por utility `bg-[radial-gradient(...)]`. |
| SUGGESTION | `next.config.ts` | Objeto vacío. Antes de PR #4 conviene `images.remotePatterns` para Supabase Storage. | Dejar TODO o añadir stub. |
| SUGGESTION | `README.md` | "Node 22.x o superior" sin `.nvmrc` ni `engines`. | Agregar `.nvmrc` con `22` y `engines.node` en `package.json`. |

**Positivos destacados:** `tsconfig` estricto y con `vistas/` excluido; ESLint 9 flat config correcto; `.env.example` sin secretos; `@import "tailwindcss"` + `@theme` bien aplicado; fuentes conectadas por CSS vars desde `next/font`; `AtSign` reemplaza al removido `Instagram`; `<html lang="es">` presente; alias `@/` funcional.
