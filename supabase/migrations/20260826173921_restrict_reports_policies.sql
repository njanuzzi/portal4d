DROP POLICY IF EXISTS "Therapist can select reports" ON public.reports;
DROP POLICY IF EXISTS "Therapist can insert reports" ON public.reports;
DROP POLICY IF EXISTS "Therapist can update reports" ON public.reports;
DROP POLICY IF EXISTS "Therapist can delete reports" ON public.reports;

CREATE POLICY "reports_client_select_own_published" ON public.reports
FOR SELECT
USING (user_id = auth.uid() AND published = true);

CREATE POLICY "reports_therapist_all" ON public.reports
FOR ALL
USING (public.is_therapist())
WITH CHECK (public.is_therapist());
