-- =============================================================================
-- VianStore — Suplemento SQL para la migración inicial (`init`).
--
-- Prisma genera CREATE TABLE profile / CREATE TYPE Role automáticamente, pero
-- NO puede expresar:
--   1. La FK profile.id → auth.users(id) (auth.users está en schema `auth` y
--      Prisma no lo migra).
--   2. RLS + policies en public.profile.
--   3. El trigger AFTER INSERT ON auth.users que crea la fila de profile.
--
-- Después de correr `pnpm db:migrate --name init`, este bloque se copia al
-- final del `migration.sql` generado en `db/migrations/<timestamp>_init/`
-- para quedar versionado con el resto del schema. Nunca se aplica solo.
--
-- Referencias:
--   - Prisma no introspecciona funciones/triggers → `prisma db pull` los
--     destruye. No correr db pull sin re-aplicar este suplemento.
--   - ALTER TYPE ... ADD VALUE (para futuros valores del enum Role) no
--     puede correr dentro de una transacción; usar migración con
--     `-- Prisma: disable-transaction` en la primera línea.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Foreign key: profile.id → auth.users(id) con CASCADE.
--    Si un usuario se elimina de auth.users (baja de cuenta), su profile
--    desaparece con él.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profile
  ADD CONSTRAINT profile_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Row Level Security en public.profile.
--    Prisma corre server-side con el SERVICE_ROLE_KEY que bypasea RLS.
--    Estas policies protegen el caso de que el ANON_KEY toque la tabla
--    (por ejemplo desde el browser vía supabase-js sin service role).
-- ---------------------------------------------------------------------------
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

-- Cliente lee su propio profile.
CREATE POLICY "profile: self read"
  ON public.profile
  FOR SELECT
  USING (auth.uid() = id);

-- Cliente edita su propio profile.
CREATE POLICY "profile: self update"
  ON public.profile
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin (identificado por app_metadata.role='admin' en el JWT) lee todos.
CREATE POLICY "profile: admin read"
  ON public.profile
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admin edita todos.
CREATE POLICY "profile: admin update"
  ON public.profile
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- INSERT queda sin policy pública: solo lo hace el trigger (SECURITY DEFINER)
-- o el server con SERVICE_ROLE_KEY (bypasea RLS).

-- ---------------------------------------------------------------------------
-- 3. Trigger de auto-creación de Profile al registrarse un usuario.
--    Dispara AFTER INSERT ON auth.users. Copia full_name desde
--    raw_user_meta_data (magic link o OAuth) y siempre asigna role='customer'.
--    Idempotente: ON CONFLICT DO NOTHING permite re-runs del seed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile (id, role, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    'customer',
    NULLIF(
      TRIM(COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name'
      )),
      ''
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
