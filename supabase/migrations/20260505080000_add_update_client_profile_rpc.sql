-- RPC: update_client_profile
-- Atualiza nome, e-mail, whatsapp, endereço e diário de um cliente.
-- Opera com SECURITY DEFINER para poder tocar em auth.users.
-- Só pode ser chamada por terapeutas.

CREATE OR REPLACE FUNCTION public.update_client_profile(
  p_client_id  uuid,
  p_name       text,
  p_email      text,
  p_whatsapp   text    DEFAULT NULL,
  p_address    text    DEFAULT NULL,
  p_diary_id   uuid    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_role  text;
  v_email_taken  integer;
BEGIN
  -- 1. Verifica que quem chama é terapeuta (via profiles, mais confiável que JWT)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'therapist'
  ) THEN
    RAISE EXCEPTION 'Apenas terapeutas podem atualizar perfis de clientes.';
  END IF;

  -- 2. Confirma que o usuário alvo é cliente
  SELECT role INTO v_client_role
  FROM public.profiles
  WHERE id = p_client_id;

  IF NOT FOUND OR v_client_role IS DISTINCT FROM 'client' THEN
    RAISE EXCEPTION 'Usuário não encontrado ou não é cliente.';
  END IF;

  -- 3. Valida que o novo e-mail não está em uso por outro usuário
  SELECT COUNT(*) INTO v_email_taken
  FROM auth.users
  WHERE email = p_email
    AND id != p_client_id;

  IF v_email_taken > 0 THEN
    RAISE EXCEPTION 'Este e-mail já está em uso por outro usuário.';
  END IF;

  -- 4. Atualiza auth.users (e-mail de login real)
  UPDATE auth.users
  SET email = p_email
  WHERE id = p_client_id;

  -- 5. Atualiza profiles (dados exibidos no portal)
  UPDATE public.profiles
  SET
    name      = p_name,
    email     = p_email,
    whatsapp  = p_whatsapp,
    address   = p_address,
    diary_id  = p_diary_id
  WHERE id = p_client_id;
END;
$$;

-- Garante que apenas usuários autenticados podem chamar a função
REVOKE ALL ON FUNCTION public.update_client_profile FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_profile TO authenticated;
