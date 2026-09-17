-- PR 93 — separate capability tokens for public assessment drafts
--
-- assessment_id is an internal identifier, not an authorization secret.
-- Public questionnaires now receive a separate opaque edit token. Only a
-- SHA-256 hash is stored server-side. Edge Functions use service_role-only
-- RPCs to issue/verify capabilities.

CREATE TABLE app_private.assessment_edit_tokens (
  instrument text NOT NULL,
  assessment_id uuid NOT NULL,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (instrument, assessment_id),
  CONSTRAINT assessment_edit_tokens_instrument_check CHECK (
    instrument IN ('schema','smi','bfi','marq','rbs','ecr','ensra','etas')
  )
);

REVOKE ALL ON TABLE app_private.assessment_edit_tokens
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE app_private.assessment_edit_tokens
TO service_role;

CREATE FUNCTION public.issue_assessment_edit_token(
  p_instrument text,
  p_assessment_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
DECLARE
  v_token text;
BEGIN
  IF p_instrument NOT IN ('schema','smi','bfi','marq','rbs','ecr','ensra','etas') THEN
    RAISE EXCEPTION 'invalid instrument';
  END IF;

  v_token := replace(pg_catalog.gen_random_uuid()::text, '-', '')
          || replace(pg_catalog.gen_random_uuid()::text, '-', '');

  INSERT INTO app_private.assessment_edit_tokens(instrument, assessment_id, token_hash)
  VALUES (
    p_instrument,
    p_assessment_id,
    pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex')
  )
  ON CONFLICT (instrument, assessment_id)
  DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    created_at = pg_catalog.now();

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_assessment_edit_token(text, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.issue_assessment_edit_token(text, uuid)
TO service_role;

CREATE FUNCTION public.verify_assessment_edit_token(
  p_instrument text,
  p_assessment_id uuid,
  p_token text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_private.assessment_edit_tokens t
    WHERE t.instrument = p_instrument
      AND t.assessment_id = p_assessment_id
      AND t.token_hash = pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex')
  );
$$;

REVOKE ALL ON FUNCTION public.verify_assessment_edit_token(text, uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_assessment_edit_token(text, uuid, text)
TO service_role;

DO $assert$
BEGIN
  IF has_function_privilege('anon', 'public.issue_assessment_edit_token(text,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.issue_assessment_edit_token(text,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.verify_assessment_edit_token(text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.verify_assessment_edit_token(text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR93: end-user role can execute assessment capability RPCs';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.issue_assessment_edit_token(text,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.verify_assessment_edit_token(text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR93: service_role lost assessment capability RPC access';
  END IF;
END;
$assert$;
