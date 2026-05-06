-- Add real login tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at  timestamptz;

-- RPC called by the client app on every authenticated load
-- Sets first_login_at only once (on first real access), always updates last_login_at
CREATE OR REPLACE FUNCTION record_client_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    first_login_at = COALESCE(first_login_at, now()),
    last_login_at  = now()
  WHERE id = auth.uid() AND role = 'client';
END;
$$;

REVOKE ALL ON FUNCTION record_client_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_client_login() TO authenticated;

-- Update get_clients_last_login to use real login data from profiles
CREATE OR REPLACE FUNCTION get_clients_last_login()
RETURNS TABLE(client_id uuid, last_login timestamptz, first_login timestamptz)
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
  SELECT p.id AS client_id, p.last_login_at AS last_login, p.first_login_at AS first_login
  FROM public.profiles p
  WHERE p.role = 'client';
END;
$$;

REVOKE ALL ON FUNCTION get_clients_last_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_clients_last_login() TO authenticated;

-- Update get_client_last_login to use real login data
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

  SELECT last_login_at INTO v_last_login
  FROM public.profiles WHERE id = p_client_id;

  RETURN v_last_login;
END;
$$;

REVOKE ALL ON FUNCTION get_client_last_login(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_client_last_login(uuid) TO authenticated;
