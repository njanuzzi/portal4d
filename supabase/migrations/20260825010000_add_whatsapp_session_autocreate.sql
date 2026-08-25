-- Cria automaticamente uma sessão "pending" no WhatsApp para todo cliente
-- novo com WhatsApp cadastrado, para que o webhook do Manychat já encontre
-- a sessão quando o cliente mandar "Oi, já cadastrei!" pelo link de
-- ativação (sem depender da terapeuta enviar o convite manual primeiro).
ALTER TABLE public.whatsapp_sessions
  ADD CONSTRAINT whatsapp_sessions_client_id_key UNIQUE (client_id);

CREATE OR REPLACE FUNCTION public.trigger_create_whatsapp_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  digits text;
  normalized_phone text;
BEGIN
  IF NEW.role = 'client' AND NEW.whatsapp IS NOT NULL THEN
    digits := regexp_replace(NEW.whatsapp, '\D', '', 'g');
    IF length(digits) > 11 THEN
      normalized_phone := digits;
    ELSE
      normalized_phone := '55' || digits;
    END IF;
    IF left(normalized_phone, 2) = '55' AND length(normalized_phone) = 13 THEN
      normalized_phone := left(normalized_phone, 4) || right(normalized_phone, length(normalized_phone) - 5);
    END IF;

    INSERT INTO public.whatsapp_sessions (client_id, phone, status)
    VALUES (NEW.id, normalized_phone, 'pending')
    ON CONFLICT (client_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_profile_insert_create_whatsapp_session ON public.profiles;
CREATE TRIGGER on_client_profile_insert_create_whatsapp_session
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trigger_create_whatsapp_session();
