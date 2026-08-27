CREATE OR REPLACE FUNCTION public.trigger_register_manychat_subscriber()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'client' AND NEW.whatsapp IS NOT NULL AND NEW.manychat_subscriber_id IS NULL THEN
    PERFORM net.http_post(
      url := 'https://ojmaxsskczukdbxpaull.supabase.co/functions/v1/manychat-register-subscriber',
      headers := '{"Authorization": "Bearer internal-trigger", "Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('client_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$;
