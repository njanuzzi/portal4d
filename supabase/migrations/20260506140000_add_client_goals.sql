CREATE TABLE public.client_goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_text       text NOT NULL CHECK (char_length(goal_text) <= 300),
  created_at      timestamptz NOT NULL DEFAULT now(),
  entry_count_at_creation integer NOT NULL DEFAULT 0
);

ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;

-- Client can read and insert their own goals
CREATE POLICY "client_own_goals" ON public.client_goals
  FOR ALL USING (user_id = auth.uid());

-- Therapist can read all goals
CREATE POLICY "therapist_read_goals" ON public.client_goals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'therapist')
  );

-- Index for fast lookup
CREATE INDEX client_goals_user_id_idx ON public.client_goals(user_id, created_at DESC);
