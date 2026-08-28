ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

ALTER TABLE public.session_reports
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.record_monthly_report_view(p_report_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.reports
  SET
    first_viewed_at = COALESCE(first_viewed_at, now()),
    last_viewed_at  = now()
  WHERE id = p_report_id AND user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_session_report_view(p_session_report_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.session_reports
  SET
    first_viewed_at = COALESCE(first_viewed_at, now()),
    last_viewed_at  = now()
  WHERE id = p_session_report_id AND client_id = auth.uid();
END;
$function$;
