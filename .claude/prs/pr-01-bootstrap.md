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
