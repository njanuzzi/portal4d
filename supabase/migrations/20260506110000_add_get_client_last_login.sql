CREATE OR REPLACE FUNCTION get_client_last_login(p_client_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_login timestamptz;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'therapist'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT last_sign_in_at INTO v_last_login
  FROM auth.users WHERE id = p_client_id;

  RETURN v_last_login;
END;
$$;

REVOKE ALL ON FUNCTION get_client_last_login(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_client_last_login(uuid) TO authenticated;
