---
pr: 3
title: Auth (Supabase) + roles
phase: 0 - Fundación
status: pending
depends_on: [2]
branch: pr-03-auth-roles
---

# PR #3 — Auth (Supabase) + roles

## Objetivo
Login funcional con magic link (email) y Google OAuth vía Supabase Auth. Al primer login se crea un `Profile` con rol por defecto `customer`. `/admin/**` sólo accesible por `admin`.

## Alcance
- [ ] Instalar `@supabase/ssr` + `@supabase/supabase-js`.
- [ ] Helpers `lib/supabase/server.ts` y `lib/supabase/client.ts` para App Router.
- [ ] Configurar Google OAuth en el proyecto Supabase (credenciales de dev).
- [ ] Configurar plantilla de magic link en Supabase (branding VianStore).
- [ ] Páginas:
  - `/login` con input de email (magic link) + botón "Continuar con Google".
  - `/auth/callback` para intercambiar código y establecer cookie de sesión.
  - `/logout` (server action).
- [ ] Trigger SQL `on_auth_user_created` que inserta la fila en `public.Profile` con rol `customer` al aparecer un nuevo usuario en `auth.users`.
- [ ] Middleware (`middleware.ts`) que:
  - Refresca la sesión en cada request.
  - Protege `/admin/**` requiriendo `role = admin`.
  - Protege `/account/**` requiriendo sesión.
- [ ] Componente `<UserMenu />` en el header (login/logout, link a cuenta).

## Definition of Done
- Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md) (compuerta obligatoria — ver [flujo global](README.md#regla-de-merge--revisión-obligatoria-por-code-reviewer)).
- Un usuario nuevo puede pedir magic link, hacer click y quedar logueado.
- Google OAuth funciona en dev.
- Al hacer login por primera vez, aparece la fila en `public.Profile`.
- Entrar a `/admin` con un `customer` redirige a `/`.
- Cambiar el rol a `admin` manualmente en DB deja pasar al `/admin`.

## Notas técnicas
- La detección de rol en el middleware requiere un query a `Profile`. Cachear en cookie o memoria si vemos latencia.
- Guardar `session.user.id` (UUID de `auth.users`) es la única forma correcta de relacionar entidades del dominio con el usuario.
