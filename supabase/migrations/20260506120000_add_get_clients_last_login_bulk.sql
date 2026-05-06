CREATE OR REPLACE FUNCTION get_clients_last_login()
RETURNS TABLE(client_id uuid, last_login timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'therapist'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT p.id AS client_id, u.last_sign_in_at AS last_login
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'client';
END;
$$;

REVOKE ALL ON FUNCTION get_clients_last_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_clients_last_login() TO authenticated;
