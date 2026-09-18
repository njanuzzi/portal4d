-- PR 94 — authenticate privileged internal Edge Function calls
--
-- pg_cron jobs and the ManyChat registration trigger used to call privileged
-- verify_jwt=false functions without a real caller credential. This migration
-- creates an opaque internal capability, stores the plaintext only in Vault,
-- stores only SHA-256 in app_private, and updates internal callers to send it.

CREATE TABLE app_private.internal_edge_auth (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE app_private.internal_edge_auth
FROM PUBLIC, anon, authenticated, service_role;

DO $$
DECLARE
  v_token text;
  v_job_count integer;
BEGIN
  SELECT count(*)::integer INTO v_job_count
  FROM cron.job
  WHERE jobname IN (
    'generate-bot-context-nightly',
    'send-diary-fill-reminder-emails-daily',
    'send-diary-reminder-emails-daily',
    'send-push-daily'
  );

  IF v_job_count <> 4 THEN
    RAISE EXCEPTION 'PR94: expected 4 internal cron jobs, found %', v_job_count;
  END IF;

  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'portal4d_internal_edge_token') THEN
    RAISE EXCEPTION 'PR94: portal4d_internal_edge_token already exists in Vault';
  END IF;

  v_token := replace(pg_catalog.gen_random_uuid()::text, '-', '')
          || replace(pg_catalog.gen_random_uuid()::text, '-', '');

  INSERT INTO app_private.internal_edge_auth(singleton, token_hash)
  VALUES (
    true,
    pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex')
  );

  PERFORM vault.create_secret(
    v_token,
    'portal4d_internal_edge_token',
    'Internal authentication token for privileged Edge Function calls',
    NULL
  );
END $$;

CREATE FUNCTION public.verify_internal_edge_token(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_private.internal_edge_auth a
    WHERE a.singleton = true
      AND a.token_hash = pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex')
  );
$$;

REVOKE ALL ON FUNCTION public.verify_internal_edge_token(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_internal_edge_token(text) TO service_role;

DO $$
DECLARE
  v_job record;
  v_url text;
  v_command text;
BEGIN
  FOR v_job IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE jobname IN (
      'generate-bot-context-nightly',
      'send-diary-fill-reminder-emails-daily',
      'send-diary-reminder-emails-daily',
      'send-push-daily'
    )
  LOOP
    v_url := CASE v_job.jobname
      WHEN 'generate-bot-context-nightly'
        THEN 'https://ojmaxsskczukdbxpaull.supabase.co/functions/v1/generate-bot-context'
      WHEN 'send-diary-fill-reminder-emails-daily'
        THEN 'https://ojmaxsskczukdbxpaull.supabase.co/functions/v1/send-diary-fill-reminder-emails'
      WHEN 'send-diary-reminder-emails-daily'
        THEN 'https://ojmaxsskczukdbxpaull.supabase.co/functions/v1/send-diary-reminder-emails'
      WHEN 'send-push-daily'
        THEN 'https://ojmaxsskczukdbxpaull.supabase.co/functions/v1/send-push-notifications'
    END;

    v_command := format(
      $cmd$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Portal-Internal-Token',
            (select decrypted_secret
             from vault.decrypted_secrets
             where name = 'portal4d_internal_edge_token')
          ),
          body := '{}'::jsonb
        );
      $cmd$,
      v_url
    );

    PERFORM cron.alter_job(v_job.jobid, NULL, v_command, NULL, NULL, NULL);
  END LOOP;

  IF (
    SELECT count(*)
    FROM cron.job
    WHERE jobname IN (
      'generate-bot-context-nightly',
      'send-diary-fill-reminder-emails-daily',
      'send-diary-reminder-emails-daily',
      'send-push-daily'
    )
      AND command ILIKE '%X-Portal-Internal-Token%'
  ) <> 4 THEN
    RAISE EXCEPTION 'PR94: not all cron jobs received internal token header';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_register_manychat_subscriber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
BEGIN
  IF NEW.role = 'client'
     AND NEW.whatsapp IS NOT NULL
     AND NEW.manychat_subscriber_id IS NULL THEN
    PERFORM net.http_post(
      url := 'https://ojmaxsskczukdbxpaull.supabase.co/functions/v1/manychat-register-subscriber',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Portal-Internal-Token',
        (select decrypted_secret
         from vault.decrypted_secrets
         where name = 'portal4d_internal_edge_token')
      ),
      body := jsonb_build_object('client_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_register_manychat_subscriber()
FROM PUBLIC, anon, authenticated, service_role;

DO $assert$
DECLARE
  v_token text;
  v_ok boolean;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'portal4d_internal_edge_token';

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'PR94: internal token missing from Vault';
  END IF;

  SELECT public.verify_internal_edge_token(v_token) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'PR94: valid internal token rejected';
  END IF;

  SELECT public.verify_internal_edge_token('wrong-token') INTO v_ok;
  IF v_ok THEN
    RAISE EXCEPTION 'PR94: invalid token accepted';
  END IF;

  IF has_function_privilege('anon', 'public.verify_internal_edge_token(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.verify_internal_edge_token(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR94: end-user role can execute verifier';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.verify_internal_edge_token(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR94: service_role cannot execute verifier';
  END IF;

  IF pg_get_functiondef('public.trigger_register_manychat_subscriber()'::regprocedure)
       NOT ILIKE '%X-Portal-Internal-Token%'
     OR pg_get_functiondef('public.trigger_register_manychat_subscriber()'::regprocedure)
       ILIKE '%Bearer internal-trigger%' THEN
    RAISE EXCEPTION 'PR94: ManyChat trigger not hardened';
  END IF;
END;
$assert$;
