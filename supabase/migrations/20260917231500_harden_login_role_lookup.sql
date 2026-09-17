-- PR 89 — remove pre-login account-role enumeration surface
--
-- The frontend no longer calls check_account_role before authentication.
-- Keep the function temporarily for trusted backend/rollback use only, but
-- remove it from end-user API roles and drop unnecessary SECURITY DEFINER.

ALTER FUNCTION public.check_account_role(text) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.check_account_role(text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_account_role(text)
TO service_role;

DO $assert$
DECLARE
  v_security_definer boolean;
BEGIN
  SELECT p.prosecdef
    INTO v_security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'check_account_role'
     AND pg_get_function_identity_arguments(p.oid) = 'p_email text';

  IF v_security_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'PR89: check_account_role is still SECURITY DEFINER';
  END IF;

  IF has_function_privilege('anon', 'public.check_account_role(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.check_account_role(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR89: check_account_role is still executable by end-user roles';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.check_account_role(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR89: service_role lost check_account_role execute privilege';
  END IF;
END;
$assert$;
