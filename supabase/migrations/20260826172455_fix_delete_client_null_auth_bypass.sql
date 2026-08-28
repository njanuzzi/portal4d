CREATE OR REPLACE FUNCTION public.delete_client(client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'therapist'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM auth.users WHERE id = client_id;
END;
$function$;
