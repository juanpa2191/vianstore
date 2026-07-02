---
pr: 14
title: CI/CD y despliegue
phase: 4 - Cierre
status: pending
depends_on: [1]
branch: pr-14-cicd-deploy
---

# PR #14 — CI/CD y despliegue

## Objetivo
La app corre en producción con dominio propio, HTTPS, backups y un pipeline que evita mergear código roto.

## Alcance
- [ ] GitHub Actions workflow:
  - En cada PR: `install` → `lint` → `typecheck` → `build`.
  - Opcional: correr `prisma migrate deploy` en modo dry-run contra base de datos efímera.
- [ ] Proyecto en Vercel:
  - Preview deployments por PR.
  - Producción desde `main`.
  - Variables de entorno separadas por entorno (dev, preview, prod).
- [ ] Proyecto Supabase **producción**:
  - Verificar cadencia de backups automáticos del plan.
  - Confirmar que `DATABASE_URL` y `DIRECT_URL` prod están en Vercel.
  - Documentar cómo restaurar un backup.
- [ ] Dominio y HTTPS configurados en Vercel.
- [ ] Runbook mínimo en `docs/ops.md`:
  - Cómo hacer deploy.
  - Cómo hacer rollback.
  - Cómo aplicar migraciones en prod (`prisma migrate deploy`).
  - Cómo rotar credenciales.

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Abrir un PR ejecuta el pipeline y bloquea el merge si algo falla.
- `main` despliega automáticamente a producción.
- La app en producción responde en el dominio con HTTPS.
- Existe un backup verificable de la DB.

## Notas técnicas
- Correr `prisma migrate deploy` como Vercel build step o como paso manual antes del release. Preferir manual controlado hasta tener confianza.
- Configurar Vercel Analytics básico (opcional) para latencia y errores.
