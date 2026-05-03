/*
  # Fix RLS policies for diaries and diary_questions

  Adds missing RLS policies so therapists can read, create, and update
  diaries and diary_questions. Without these, all write operations fail
  with a 403/RLS violation.

  1. diaries
     - SELECT: therapists only
     - INSERT: therapists only
     - UPDATE: therapists only
  2. diary_questions
     - SELECT: therapists only
     - INSERT: therapists only
     - DELETE: therapists only (needed for question deletion in DiaryDetail)
*/

-- diaries
CREATE POLICY "Therapists can view all diaries"
  ON diaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'therapist')
  );

CREATE POLICY "Therapists can create diaries"
  ON diaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'therapist')
  );

CREATE POLICY "Therapists can update diaries"
  ON diaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'therapist')
  );

-- diary_questions
CREATE POLICY "Therapists can view all questions"
  ON diary_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'therapist')
  );

CREATE POLICY "Therapists can create questions"
  ON diary_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'therapist')
  );

CREATE POLICY "Therapists can delete questions"
  ON diary_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'therapist')
  );
