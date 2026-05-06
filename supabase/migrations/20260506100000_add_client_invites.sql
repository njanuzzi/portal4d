CREATE TABLE client_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email      text NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapist_manage_invites" ON client_invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'therapist')
  );
