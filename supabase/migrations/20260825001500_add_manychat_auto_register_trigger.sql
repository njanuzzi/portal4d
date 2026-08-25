-- Todo cliente novo com WhatsApp cadastrado é automaticamente registrado
-- como subscriber no Manychat (webhook fire-and-forget via pg_net) — a
-- função manychat-register-subscriber é idempotente e grava o
-- manychat_subscriber_id de volta em profiles.
ALTER TABLE public.profiles ADD COLUMN manychat_subscriber_id text;

CREATE OR REPLACE FUNCTION public.trigger_register_manychat_subscriber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role = 'client' AND NEW.whatsapp IS NOT NULL AND NEW.manychat_subscriber_id IS NULL THEN
    PERFORM net.http_post(
      url := 'https://ojmaxsskczukdbxpaull.supabase.co/functions/v1/manychat-register-subscriber',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbWF4c3NrY3p1a2RieHBhdWxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc2NzM1MSwiZXhwIjoyMDkzMzQzMzUxfQ._fzZTSMMblmnzayepT0hH8K1i1dJ1q5d7y-5z-h53wQ", "Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('client_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_client_profile_insert_register_manychat ON public.profiles;
CREATE TRIGGER on_client_profile_insert_register_manychat
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trigger_register_manychat_subscriber();
