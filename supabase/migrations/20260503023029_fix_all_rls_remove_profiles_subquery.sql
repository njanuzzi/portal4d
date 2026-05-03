/*
  # Corrigir RLS em todas as tabelas — remover subqueries a profiles

  PROBLEMA: Todas as policies usavam EXISTS (SELECT 1 FROM profiles WHERE role = ...)
  para verificar se o usuário é terapeuta/cliente. Isso faz o Supabase Auth
  consultar profiles durante o processo de login, causando HTTP 500.

  SOLUÇÃO: Substituir por auth.jwt()->'user_metadata'->>'role' que lê o role
  diretamente do token JWT, sem tocar no banco durante a autenticação.

  Tabelas corrigidas: diaries, diary_entries, diary_questions, entry_answers, reports
*/

-- ============================================================
-- DIARIES
-- ============================================================
DROP POLICY IF EXISTS "Therapist can manage diaries" ON diaries;
DROP POLICY IF EXISTS "Therapist can insert diaries" ON diaries;
DROP POLICY IF EXISTS "Therapist can update diaries" ON diaries;
DROP POLICY IF EXISTS "Clients can read active diary" ON diaries;

CREATE POLICY "Therapist can read diaries"
  ON diaries FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Therapist can insert diaries"
  ON diaries FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Therapist can update diaries"
  ON diaries FOR UPDATE TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  )
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Clients can read active diary"
  ON diaries FOR SELECT TO authenticated
  USING (
    (
      (auth.jwt()->'user_metadata'->>'role') = 'client'
      OR (auth.jwt()->'app_metadata'->>'role') = 'client'
    )
    AND is_active = true
  );

-- ============================================================
-- DIARY_ENTRIES
-- ============================================================
DROP POLICY IF EXISTS "Therapist can read all entries" ON diary_entries;
DROP POLICY IF EXISTS "Client can read own entries" ON diary_entries;
DROP POLICY IF EXISTS "Client can insert own entries" ON diary_entries;

CREATE POLICY "Therapist can read all entries"
  ON diary_entries FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Client can read own entries"
  ON diary_entries FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      (auth.jwt()->'user_metadata'->>'role') = 'client'
      OR (auth.jwt()->'app_metadata'->>'role') = 'client'
    )
  );

CREATE POLICY "Client can insert own entries"
  ON diary_entries FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (auth.jwt()->'user_metadata'->>'role') = 'client'
      OR (auth.jwt()->'app_metadata'->>'role') = 'client'
    )
  );

-- ============================================================
-- DIARY_QUESTIONS
-- ============================================================
DROP POLICY IF EXISTS "Therapist can manage questions" ON diary_questions;
DROP POLICY IF EXISTS "Therapist can insert questions" ON diary_questions;
DROP POLICY IF EXISTS "Therapist can update questions" ON diary_questions;
DROP POLICY IF EXISTS "Therapist can delete questions" ON diary_questions;
DROP POLICY IF EXISTS "Clients can read questions of active diary" ON diary_questions;

CREATE POLICY "Therapist can read questions"
  ON diary_questions FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Therapist can insert questions"
  ON diary_questions FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Therapist can update questions"
  ON diary_questions FOR UPDATE TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  )
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Therapist can delete questions"
  ON diary_questions FOR DELETE TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Clients can read questions of active diary"
  ON diary_questions FOR SELECT TO authenticated
  USING (
    (
      (auth.jwt()->'user_metadata'->>'role') = 'client'
      OR (auth.jwt()->'app_metadata'->>'role') = 'client'
    )
    AND EXISTS (
      SELECT 1 FROM diaries d
      WHERE d.id = diary_questions.diary_id AND d.is_active = true
    )
  );

-- ============================================================
-- ENTRY_ANSWERS
-- ============================================================
DROP POLICY IF EXISTS "Therapist can read all answers" ON entry_answers;
DROP POLICY IF EXISTS "Client can read own answers" ON entry_answers;
DROP POLICY IF EXISTS "Client can insert own answers" ON entry_answers;

CREATE POLICY "Therapist can read all answers"
  ON entry_answers FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Client can read own answers"
  ON entry_answers FOR SELECT TO authenticated
  USING (
    (
      (auth.jwt()->'user_metadata'->>'role') = 'client'
      OR (auth.jwt()->'app_metadata'->>'role') = 'client'
    )
    AND EXISTS (
      SELECT 1 FROM diary_entries de
      WHERE de.id = entry_answers.entry_id AND de.user_id = auth.uid()
    )
  );

CREATE POLICY "Client can insert own answers"
  ON entry_answers FOR INSERT TO authenticated
  WITH CHECK (
    (
      (auth.jwt()->'user_metadata'->>'role') = 'client'
      OR (auth.jwt()->'app_metadata'->>'role') = 'client'
    )
    AND EXISTS (
      SELECT 1 FROM diary_entries de
      WHERE de.id = entry_answers.entry_id AND de.user_id = auth.uid()
    )
  );

-- ============================================================
-- REPORTS
-- ============================================================
DROP POLICY IF EXISTS "Therapist can read all reports" ON reports;
DROP POLICY IF EXISTS "Therapist can insert reports" ON reports;
DROP POLICY IF EXISTS "Therapist can update reports" ON reports;
DROP POLICY IF EXISTS "Client can read own published reports" ON reports;

CREATE POLICY "Therapist can read all reports"
  ON reports FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Therapist can insert reports"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Therapist can update reports"
  ON reports FOR UPDATE TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  )
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'therapist'
    OR (auth.jwt()->'app_metadata'->>'role') = 'therapist'
  );

CREATE POLICY "Client can read own published reports"
  ON reports FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND published = true
    AND (
      (auth.jwt()->'user_metadata'->>'role') = 'client'
      OR (auth.jwt()->'app_metadata'->>'role') = 'client'
    )
  );
