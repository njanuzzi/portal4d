-- PR 90 — move RLS authorization helper out of exposed public schema
--
-- public.is_therapist() is not a business RPC. It exists only to support RLS
-- without recursive reads on public.profiles. Keeping it in public exposes it
-- through PostgREST and triggers SECURITY DEFINER advisor warnings.
--
-- This migration moves the helper to app_private, updates every dependent
-- policy (public + storage), restricts schema/function access, and removes the
-- public RPC surface.

CREATE SCHEMA app_private AUTHORIZATION postgres;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE FUNCTION app_private.is_therapist()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'therapist'
  );
$$;

REVOKE ALL ON FUNCTION app_private.is_therapist()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION app_private.is_therapist()
TO authenticated, service_role;

ALTER POLICY "profiles_select_own_or_therapist"
  ON public.profiles
  TO authenticated
  USING (auth.uid() = id OR app_private.is_therapist());

ALTER POLICY "reports_therapist_all"
  ON public.reports
  TO authenticated
  USING (app_private.is_therapist())
  WITH CHECK (app_private.is_therapist());

ALTER POLICY "therapist manages content articles"
  ON public.content_articles
  TO authenticated
  USING (app_private.is_therapist())
  WITH CHECK (app_private.is_therapist());

ALTER POLICY "usuaria_edita_proprios_roteiros"
  ON public.roteiros
  TO authenticated
  USING (auth.uid() = user_id AND app_private.is_therapist())
  WITH CHECK (auth.uid() = user_id AND app_private.is_therapist());

ALTER POLICY "usuaria_le_proprios_roteiros"
  ON public.roteiros
  TO authenticated
  USING (auth.uid() = user_id AND app_private.is_therapist());

ALTER POLICY "therapist uploads content images"
  ON storage.objects
  TO authenticated
  WITH CHECK (bucket_id = 'content-images' AND app_private.is_therapist());

ALTER POLICY "therapist updates content images"
  ON storage.objects
  TO authenticated
  USING (bucket_id = 'content-images' AND app_private.is_therapist())
  WITH CHECK (bucket_id = 'content-images' AND app_private.is_therapist());

ALTER POLICY "therapist deletes content images"
  ON storage.objects
  TO authenticated
  USING (bucket_id = 'content-images' AND app_private.is_therapist());

DROP FUNCTION public.is_therapist();

DO $assert$
BEGIN
  IF to_regprocedure('public.is_therapist()') IS NOT NULL THEN
    RAISE EXCEPTION 'PR90: public.is_therapist still exists';
  END IF;

  IF to_regprocedure('app_private.is_therapist()') IS NULL THEN
    RAISE EXCEPTION 'PR90: app_private.is_therapist missing';
  END IF;

  IF has_function_privilege('anon', 'app_private.is_therapist()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR90: anon can execute private RLS helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'app_private.is_therapist()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR90: authenticated cannot execute private RLS helper';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE (coalesce(qual, '') ILIKE '%public.is_therapist%'
       OR coalesce(with_check, '') ILIKE '%public.is_therapist%')
  ) THEN
    RAISE EXCEPTION 'PR90: policy still references public.is_therapist';
  END IF;
END;
$assert$;
