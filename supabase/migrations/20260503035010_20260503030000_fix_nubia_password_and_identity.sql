/*
  # Corrigir senha e identity da Núbia

  Atualiza a senha de nubia@portald4.com para Admin4D@2026
  e garante que a identity de email existe corretamente.
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'nubia@portald4.com';

  IF v_user_id IS NOT NULL THEN
    -- Update password
    UPDATE auth.users
    SET
      encrypted_password = crypt('Admin4D@2026', gen_salt('bf')),
      updated_at = now()
    WHERE id = v_user_id;

    -- Ensure identity exists
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      created_at,
      updated_at,
      last_sign_in_at
    )
    VALUES (
      v_user_id,
      v_user_id,
      'nubia@portald4.com',
      'email',
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', 'nubia@portald4.com',
        'provider', 'email',
        'email_verified', true
      ),
      now(),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
      SET
        identity_data = jsonb_build_object(
          'sub', v_user_id::text,
          'email', 'nubia@portald4.com',
          'provider', 'email',
          'email_verified', true
        ),
        updated_at = now();

    -- Ensure profile is therapist
    INSERT INTO public.profiles (id, email, name, role, active)
    VALUES (v_user_id, 'nubia@portald4.com', 'Núbia Admin', 'therapist', true)
    ON CONFLICT (id) DO UPDATE
      SET role = 'therapist', name = 'Núbia Admin', active = true;
  END IF;
END $$;
