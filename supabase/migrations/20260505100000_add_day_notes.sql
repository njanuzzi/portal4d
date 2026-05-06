CREATE TABLE IF NOT EXISTS day_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  noted_at    timestamptz NOT NULL DEFAULT now(),
  content     text,
  emotions    jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE day_notes ENABLE ROW LEVEL SECURITY;

-- Client can manage their own notes
CREATE POLICY "client_own_notes" ON day_notes
  FOR ALL USING (auth.uid() = user_id);

-- Therapist can read all notes
CREATE POLICY "therapist_read_notes" ON day_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );
