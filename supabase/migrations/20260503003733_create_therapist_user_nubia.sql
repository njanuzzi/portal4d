/*
  # Criar usuário terapeuta inicial — Núbia

  Insere nubia@portald4.com em auth.users com senha bcrypt
  e garante perfil com role = therapist.
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only create if user doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'nubia@portald4.com') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'nubia@portald4.com',
      crypt('AdminD4@2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Núbia","role":"therapist"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'nubia@portald4.com';
  END IF;

  -- Upsert profile as therapist
  INSERT INTO profiles (id, email, name, role, active)
  VALUES (v_user_id, 'nubia@portald4.com', 'Núbia', 'therapist', true)
  ON CONFLICT (id) DO UPDATE
    SET role = 'therapist', name = 'Núbia', active = true;
END $$;
