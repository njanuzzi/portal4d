CREATE OR REPLACE FUNCTION public.is_therapist()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'therapist'
  );
$function$;

DROP POLICY IF EXISTS "Simple profile access" ON public.profiles;

CREATE POLICY "profiles_select_own_or_therapist" ON public.profiles
FOR SELECT
USING (auth.uid() = id OR public.is_therapist());
