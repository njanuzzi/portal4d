-- PR 97 — server-side abuse protection for public client signup

CREATE TABLE app_private.client_signup_rate_limits (
  key_hash text PRIMARY KEY,
  dimension text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE app_private.client_signup_rate_limits
FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.check_client_signup_rate_limit(
  p_ip text,
  p_email text,
  p_phone text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
DECLARE
  v_item record;
  v_hash text;
  v_count integer;
  v_limit integer;
BEGIN
  DELETE FROM app_private.client_signup_rate_limits
  WHERE window_started_at < pg_catalog.now() - interval '2 days';

  FOR v_item IN
    SELECT *
    FROM (VALUES
      ('ip', nullif(btrim(p_ip), ''), 10),
      ('email', lower(nullif(btrim(p_email), '')), 3),
      ('phone', nullif(regexp_replace(p_phone, '[^0-9]', '', 'g'), ''), 3)
    ) AS x(dimension, value, max_requests)
    WHERE value IS NOT NULL
  LOOP
    v_hash := pg_catalog.encode(
      extensions.digest(v_item.dimension || ':' || v_item.value, 'sha256'),
      'hex'
    );
    v_limit := v_item.max_requests;

    INSERT INTO app_private.client_signup_rate_limits(
      key_hash, dimension, window_started_at, request_count, updated_at
    )
    VALUES (
      v_hash, v_item.dimension, pg_catalog.now(), 1, pg_catalog.now()
    )
    ON CONFLICT (key_hash) DO UPDATE SET
      dimension = EXCLUDED.dimension,
      window_started_at = CASE
        WHEN app_private.client_signup_rate_limits.window_started_at
             < pg_catalog.now() - interval '1 hour'
          THEN pg_catalog.now()
        ELSE app_private.client_signup_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN app_private.client_signup_rate_limits.window_started_at
             < pg_catalog.now() - interval '1 hour'
          THEN 1
        ELSE app_private.client_signup_rate_limits.request_count + 1
      END,
      updated_at = pg_catalog.now()
    RETURNING request_count INTO v_count;

    IF v_count > v_limit THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_client_signup_rate_limit(text, text, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_client_signup_rate_limit(text, text, text)
TO service_role;

DO $assert$
BEGIN
  IF has_function_privilege(
       'anon',
       'public.check_client_signup_rate_limit(text,text,text)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.check_client_signup_rate_limit(text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'PR97: end-user role can execute signup rate limiter';
  END IF;

  IF NOT has_function_privilege(
       'service_role',
       'public.check_client_signup_rate_limit(text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'PR97: service_role cannot execute signup rate limiter';
  END IF;
END;
$assert$;
