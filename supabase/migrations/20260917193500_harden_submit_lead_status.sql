-- PR 86 — restringe estados que podem ser definidos na criação pública de leads.
--
-- O formulário público precisa apenas de:
-- - novo (default);
-- - selecao (inscrição para sessão de avaliação).
--
-- Estados administrativos continuam disponíveis para a terapeuta via UPDATE da
-- tabela sob RLS, mas deixam de poder ser escolhidos por um chamador anon na RPC.

CREATE OR REPLACE FUNCTION public.submit_lead(
  p_name text,
  p_email text,
  p_whatsapp text,
  p_source text,
  p_answers jsonb DEFAULT NULL::jsonb,
  p_status text DEFAULT 'novo'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_status text;
BEGIN
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  IF p_source IS NULL OR length(trim(p_source)) = 0 THEN
    RAISE EXCEPTION 'invalid source';
  END IF;

  v_status := coalesce(nullif(trim(p_status), ''), 'novo');

  IF v_status NOT IN ('novo', 'selecao') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  INSERT INTO public.leads (name, email, whatsapp, source, answers, status)
  VALUES (
    nullif(trim(p_name), ''),
    lower(trim(p_email)),
    nullif(trim(p_whatsapp), ''),
    p_source,
    p_answers,
    v_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_lead(text, text, text, text, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_lead(text, text, text, text, jsonb, text)
  TO anon, authenticated, service_role;
