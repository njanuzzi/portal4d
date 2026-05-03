/*
  # Portal D4 / Protocolo 4D - Schema Inicial

  ## Tabelas criadas:
  1. `profiles` - Perfis de usuários (terapeuta e clientes)
     - id (uuid, referencia auth.users)
     - email, name, role (therapist | client), active, created_at

  2. `diaries` - Diários estruturados criados pela terapeuta
     - id, name, is_active, created_at, updated_at

  3. `diary_questions` - Perguntas de cada diário
     - id, diary_id, order, text, type (text | number | scale)

  4. `diary_entries` - Registro de uma resposta diária de um cliente
     - id, user_id, diary_id, date, created_at
     - Unique constraint em (user_id, date) para garantir uma resposta por dia

  5. `entry_answers` - Respostas individuais por pergunta
     - id, entry_id, question_id, answer_text, answer_value

  6. `reports` - Relatórios manuais da terapeuta para clientes
     - id, user_id, period_start, period_end, content_text, published, created_at

  ## Segurança:
  - RLS habilitado em todas as tabelas
  - Terapeuta pode ler e escrever tudo
  - Cliente só pode ler/escrever os próprios dados
  - Cliente não vê relatórios não publicados
  - Apenas um diário pode estar ativo por vez (via trigger)
*/

-- ==========================================
-- PROFILES
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('therapist', 'client')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
    OR auth.uid() = id
  );

CREATE POLICY "Therapist can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
    OR auth.uid() = id
  );

CREATE POLICY "Therapist can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
    OR auth.uid() = id
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
    OR auth.uid() = id
  );

-- ==========================================
-- DIARIES
-- ==========================================
CREATE TABLE IF NOT EXISTS diaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist can manage diaries"
  ON diaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Therapist can insert diaries"
  ON diaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Therapist can update diaries"
  ON diaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Clients can read active diary"
  ON diaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
    AND is_active = true
  );

-- Function to ensure only one diary is active at a time
CREATE OR REPLACE FUNCTION enforce_single_active_diary()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE diaries SET is_active = false WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_single_active_diary
  BEFORE INSERT OR UPDATE ON diaries
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_diary();

-- ==========================================
-- DIARY QUESTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS diary_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id uuid NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
  "order" integer NOT NULL DEFAULT 0,
  text text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'number', 'scale')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diary_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist can manage questions"
  ON diary_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Therapist can insert questions"
  ON diary_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Therapist can update questions"
  ON diary_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Therapist can delete questions"
  ON diary_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Clients can read questions of active diary"
  ON diary_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
    AND EXISTS (SELECT 1 FROM diaries d WHERE d.id = diary_id AND d.is_active = true)
  );

-- ==========================================
-- DIARY ENTRIES
-- ==========================================
CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  diary_id uuid NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist can read all entries"
  ON diary_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Client can read own entries"
  ON diary_entries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
  );

CREATE POLICY "Client can insert own entries"
  ON diary_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
  );

-- ==========================================
-- ENTRY ANSWERS
-- ==========================================
CREATE TABLE IF NOT EXISTS entry_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES diary_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_value numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entry_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist can read all answers"
  ON entry_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Client can read own answers"
  ON entry_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diary_entries de
      WHERE de.id = entry_id AND de.user_id = auth.uid()
    )
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
  );

CREATE POLICY "Client can insert own answers"
  ON entry_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diary_entries de
      WHERE de.id = entry_id AND de.user_id = auth.uid()
    )
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
  );

-- ==========================================
-- REPORTS
-- ==========================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  content_text text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist can read all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Therapist can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Therapist can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "Client can read own published reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND published = true
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
  );

-- ==========================================
-- FUNCTION: auto-create profile on signup
-- ==========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date);
CREATE INDEX IF NOT EXISTS idx_entry_answers_entry_id ON entry_answers(entry_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_questions_diary_id ON diary_questions(diary_id);
