---
pr: 3
title: Auth (Supabase) + roles
phase: 0 - Fundación
status: merged
depends_on: [2]
branch: pr-03-auth-roles
---

# PR #3 — Auth (Supabase) + roles

## Objetivo
Login funcional con magic link (email) y Google OAuth vía Supabase Auth. Al primer login se crea un `Profile` con rol por defecto `customer`. `/admin/**` sólo accesible por `admin`.

## Alcance
- [x] Instalar `@supabase/ssr` + `@supabase/supabase-js`.
- [x] Helpers `lib/supabase/server.ts` y `lib/supabase/client.ts` para App Router.
- [x] Configurar Google OAuth en el proyecto Supabase (credenciales de dev). *(fuera del código — a cargo del usuario)*
- [ ] Configurar plantilla de magic link en Supabase (branding VianStore). *(diferido — se usa la plantilla default de Supabase; personalización no bloquea DoD y se hace en PR posterior o directamente en el dashboard)*
- [x] Páginas:
  - `/login` con input de email (magic link) + botón "Continuar con Google".
  - `/auth/callback` para intercambiar código y establecer cookie de sesión.
  - `/auth/signout` (route handler POST — invocable desde `<form>`).
- [x] Trigger SQL `on_auth_user_created` — ya cubierto por la migración inicial de PR #2.
- [x] `proxy.ts` (Next 16 renombró `middleware.ts` → `proxy.ts`) que:
  - Refresca la sesión en cada request.
  - Protege `/admin/**` requiriendo `role = admin` (leído de `app_metadata`).
  - Protege `/account/**` requiriendo sesión.
- [x] Componente `<UserMenu />` en el header (login/logout, link a cuenta y admin).

## Definition of Done
- [x] Veredicto **`APPROVE`** del agente [`code-reviewer`](../agents/code-reviewer.md).
- [x] Un usuario nuevo puede pedir magic link, hacer click y quedar logueado. *(verificado con `juanpa2191@hotmail.com`.)*
- [x] Google OAuth funciona en dev. *(verificado con `juanpa2191@gmail.com`.)*
- [x] Al hacer login por primera vez, aparece la fila en `public.profile`. *(verificado — 2 rows creadas por el trigger, ambas con `role='customer'`.)*
- [x] Entrar a `/admin` con un `customer` redirige. *(verificado — cae en `/?denied=admin` con el mensaje del proxy.)*
- [x] Cambiar el rol a `admin` manualmente en DB (y en `auth.users.raw_app_meta_data`) deja pasar al `/admin` tras re-login. *(verificado — script one-shot `_promote_admin.ts` promovió `juanpa2191@gmail.com`, tras signout/signin el UserMenu muestra link "Admin" y `/admin` renderiza el placeholder.)*

## Notas técnicas
- **Next 16 renombró `middleware.ts` → `proxy.ts`** (con función `export function proxy` en vez de `export default`). El archivo raíz `proxy.ts` es el correcto; el spec original decía `middleware.ts` por venir escrito antes de conocer el cambio.
- **Rol desde JWT (`app_metadata.role`)**, no query a Prisma en el proxy. Consistente con las RLS policies. Trade-off aceptado: un customer promovido a admin necesita sign-out + sign-in para refrescar el JWT — aceptable porque el cambio de privilegios es raro y merece re-autenticación explícita.
- **`app_metadata` (no `user_metadata`)** para el rol — `app_metadata` solo es escribible por el server con `service_role`, mientras que `user_metadata` es editable por el cliente y por tanto spoofable.
- **`getUser()` en vez de `getSession()`** en el proxy y en los server components sensibles — valida el JWT contra Supabase Auth, mientras que `getSession()` solo lee la cookie y es vulnerable a tokens forjados.
- **Signout como POST** (`/auth/signout` route handler) para funcionar desde `<form method="POST">` sin JS y evitar CSRF de GET-signout.
- **Google SVG inline** en `GoogleButton.tsx` — `lucide-react` v1 removió íconos de marca, no se puede importar `Google` desde la lib.

## Code review

**Fecha:** 2026-07-03
**Agente:** [`code-reviewer`](../agents/code-reviewer.md)
**Veredicto final:** `APPROVE` (tras aplicar HIGH + MEDIUM del primer pase).
**Primer pase:** `APPROVE WITH SUGGESTIONS` — 16 archivos revisados. 0 CRITICAL · 1 HIGH · 2 MEDIUM · 5 LOW.
**Fixes aplicados en el mismo PR:**
- HIGH (`app/auth/callback/route.ts`): los 3 `NextResponse.redirect(...)` cambiados de string template a `new URL(next, origin)` — defensa extra contra caracteres de control que pudieran filtrarse al header `Location`, además del `safeInternalPath` que ya sanitizaba.
- MEDIUM (`app/auth/callback/route.ts`): documentado el defer del fallback cross-browser (magic link abierto en browser distinto al que envió el form) — nota concreta indicando cómo abordar en el futuro (cookie `sb-next`).
- MEDIUM (`app/login/actions.ts`): `resolveOrigin` ahora exige `NEXT_PUBLIC_APP_URL` en `NODE_ENV === "production"` (throw si falta), y solo permite el fallback a `x-forwarded-host`/`host` en dev. Cerrar Host header injection: sin el guard, un atacante podría hacer llegar el magic link con `emailRedirectTo` apuntando a su dominio.

**Segundo pase:** `APPROVE` — 2 fixes verificados, sin regresiones. `pnpm typecheck` y `pnpm lint` limpios post-fix.

**Deferidos (registrados para trabajarse al tocar el archivo relacionado):**
- LOW (`app/login/actions.ts:88-93`): `return` explícito tras el `redirect` del branch de error — legibilidad; `redirect()` lanza pero un lector nuevo puede no verlo.
- LOW (`lib/safe-redirect.ts:10`): rechazar candidatos con `%2f`, `%5c` (case-insensitive) y caracteres de control (`\r\n`).
- LOW (`components/UserMenuDropdown.tsx:24-42`): a11y — devolver foco al botón trigger cuando se cierra con Esc (`useRef` + `.focus()`).
- LOW (`components/UserMenu.tsx:32-36`): comentario aclarando que `user_metadata.full_name` es display-only y no debe ir a `dangerouslySetInnerHTML`.
- LOW (`proxy.ts:53`): matcher con exclusión por extensiones vía regex — simplificar con `has`/`missing` de Next 16 antes de que aparezcan rutas con `.` (ej: `nike-air.max`).

## E2E

**Fecha:** 2026-07-03. Ejecutadas por el usuario en browser real (Chrome) contra `http://localhost:3000` con Supabase dev. Este PR excepcionalmente corrió E2E antes del `code-reviewer`; a partir de PR #4 la regla es `code-reviewer` primero y E2E después.

| # | Prueba | Resultado |
|---|---|---|
| 1 | Magic link con `juanpa2191@hotmail.com` → email recibido → click → sesión activa. | ✅ |
| 2 | Google OAuth con `juanpa2191@gmail.com` → autorización Google → sesión activa. | ✅ |
| 3 | `/admin` como customer → redirect a `/?denied=admin` (visto en URL bar). | ✅ |
| 4 | Promoción a admin (`profile.role='admin'` + `auth.users.raw_app_meta_data.role='admin'`) + signout/signin → UserMenu muestra link "Admin" + `/admin` renderiza el placeholder. | ✅ |

**Verificación cruzada en DB:** 3 rows en `public.profile` tras las pruebas — 1 del seed (admin@vianstore.local) + 2 de tests (juanpa2191@gmail.com como admin promovido, juanpa2191@hotmail.com como customer). El trigger `on_auth_user_created` disparó correctamente en ambos flujos y tomó `full_name` de `raw_user_meta_data` cuando venía (Google).
