-- PR 98 — verify Cal.com webhook HMAC using a Vault-backed secret
--
-- Deployment prerequisite:
-- vault secret "cal_webhook_secret" must already exist. Production rollout
-- copies the currently active Cal.com HMAC secret into Vault out-of-band
-- before this migration is applied, preserving the existing Cal.com config.

CREATE FUNCTION public.verify_cal_webhook_signature(
  p_raw_body text,
  p_signature text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
  SELECT CASE
    WHEN p_signature IS NULL OR p_signature = '' THEN false
    ELSE EXISTS (
      SELECT 1
      FROM vault.decrypted_secrets s
      WHERE s.name = 'cal_webhook_secret'
        AND lower(p_signature) = pg_catalog.encode(
          extensions.hmac(
            pg_catalog.convert_to(p_raw_body, 'UTF8'),
            pg_catalog.convert_to(s.decrypted_secret, 'UTF8'),
            'sha256'
          ),
          'hex'
        )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.verify_cal_webhook_signature(text, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_cal_webhook_signature(text, text)
TO service_role;

DO $assert$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'cal_webhook_secret'
  ) THEN
    RAISE EXCEPTION 'PR98: cal_webhook_secret missing from Vault';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.verify_cal_webhook_signature(text,text)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.verify_cal_webhook_signature(text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'PR98: end-user role can execute Cal webhook verifier';
  END IF;

  IF NOT has_function_privilege(
       'service_role',
       'public.verify_cal_webhook_signature(text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'PR98: service_role cannot execute Cal webhook verifier';
  END IF;
END;
$assert$;
