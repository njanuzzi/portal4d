-- PR 88 — remove unnecessary SECURITY DEFINER from login tracking RPCs
--
-- Production rollback smoke test on 2026-09-17 confirmed these functions work
-- correctly as SECURITY INVOKER under the existing profiles RLS policies.
-- No signature, body, grants, or frontend contract changes.

ALTER FUNCTION public.record_client_login() SECURITY INVOKER;
ALTER FUNCTION public.get_client_last_login(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_clients_last_login() SECURITY INVOKER;

DO $assert$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'record_client_login',
        'get_client_last_login',
        'get_clients_last_login'
      )
      AND p.prosecdef = true
  ) THEN
    RAISE EXCEPTION 'PR88: one or more login tracking functions are still SECURITY DEFINER';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.record_client_login()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_client_last_login(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_clients_last_login()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR88: authenticated lost required execute privilege';
  END IF;

  IF has_function_privilege('anon', 'public.record_client_login()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_client_last_login(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_clients_last_login()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR88: anon unexpectedly gained execute privilege';
  END IF;
END;
$assert$;
