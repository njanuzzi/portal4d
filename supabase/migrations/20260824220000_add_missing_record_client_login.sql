-- A migração 20260506130000_add_client_login_tracking.sql definia esta
-- função, mas ela nunca chegou a existir de fato no banco de produção
-- (apenas get_client_last_login e get_clients_last_login foram criadas).
-- Resultado: nenhum login de cliente jamais foi registrado, então o
-- Dashboard e a ficha do cliente sempre mostravam "nunca acessou" mesmo
-- para clientes que já usavam o portal normalmente.
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
