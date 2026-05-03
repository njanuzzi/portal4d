/*
  # Corrigir RLS recursivo em profiles

  As políticas anteriores faziam self-join em profiles para verificar
  se o usuário era terapeuta (SELECT 1 FROM profiles WHERE id = auth.uid()).
  Isso causa recursão infinita quando o Supabase Auth consulta o schema
  durante o login, resultando em HTTP 500 "Database error querying schema".

  Solução: usar auth.uid() diretamente para identificar o dono da linha,
  sem consultar profiles novamente. O acesso do terapeuta a outros profiles
  é garantido por uma policy separada que usa raw_user_meta_data.
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Therapist can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Therapist can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Therapist can update all profiles" ON profiles;

-- SELECT: user can read own profile (no recursion)
-- Therapist reads all: checked via JWT metadata to avoid recursion
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'therapist'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
  );

-- INSERT: only via trigger (service role) or own id
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: user updates own, therapist updates any
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'therapist'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
  )
  WITH CHECK (
    auth.uid() = id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'therapist'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
  );
