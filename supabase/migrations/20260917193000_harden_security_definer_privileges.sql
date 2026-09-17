-- PR 86 — hardening de SECURITY DEFINER / RPCs
--
-- Objetivos:
-- 1. preservar o uso intencional de SECURITY DEFINER;
-- 2. tornar EXECUTE explícito por role, sem depender dos default privileges do Supabase;
-- 3. fixar search_path em todas as funções SECURITY DEFINER atuais;
-- 4. versionar RPCs que existem em produção sem definição equivalente no Git;
-- 5. reforçar a integridade do envio público do diário.
--
-- Esta migration não remove SECURITY DEFINER das funções existentes.

-- -----------------------------------------------------------------------------
-- 1. Versiona check_account_role conforme produção e fixa search_path.
-- Mantida pública nesta PR porque o fluxo de login a chama antes da autenticação.
-- O risco de enumeração de conta é documentado para revisão separada.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_account_role(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT role
    INTO v_role
    FROM public.profiles
   WHERE lower(email) = lower(p_email)
   LIMIT 1;

  RETURN v_role;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Versiona a assinatura atual de submit_lead observada em produção.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_lead(
  p_name text,
  p_email text,
  p_whatsapp text,
  p_source text,
  p_answers jsonb DEFAULT NULL::jsonb,
  p_status text DEFAULT 'novo'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  IF p_source IS NULL OR length(trim(p_source)) = 0 THEN
    RAISE EXCEPTION 'invalid source';
  END IF;

  INSERT INTO public.leads (name, email, whatsapp, source, answers, status)
  VALUES (
    nullif(trim(p_name), ''),
    lower(trim(p_email)),
    nullif(trim(p_whatsapp), ''),
    p_source,
    p_answers,
    coalesce(nullif(trim(p_status), ''), 'novo')
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Reforça submit_client_diary_entry sem mudar o contrato usado pelo frontend.
--
-- Antes, um token válido identificava o cliente, mas p_diary_id e question_id
-- eram aceitos diretamente do navegador. Agora a função confirma que:
-- - p_diary_id é o diário ativo atribuído ao cliente daquele token;
-- - cada question_id pertence a esse diário;
-- - p_answers é um array JSON.
--
-- A validação acontece antes de qualquer INSERT para evitar escrita parcial.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_client_diary_entry(
  p_token text,
  p_date date,
  p_diary_id uuid,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_client_id uuid;
  v_expected_diary_id uuid;
  v_entry_id uuid;
  v_answer jsonb;
  v_question_id uuid;
BEGIN
  SELECT ct.client_id, prof.diary_id
    INTO v_client_id, v_expected_diary_id
    FROM public.client_tokens AS ct
    JOIN public.profiles AS prof ON prof.id = ct.client_id
    JOIN public.diaries AS d ON d.id = prof.diary_id
   WHERE ct.token = p_token
     AND ct.expires_at > now()
     AND prof.role = 'client'
     AND prof.active = true
     AND d.is_active = true
   LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  IF v_expected_diary_id IS NULL OR p_diary_id IS DISTINCT FROM v_expected_diary_id THEN
    RETURN jsonb_build_object('error', 'invalid_diary');
  END IF;

  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'array' THEN
    RETURN jsonb_build_object('error', 'invalid_answers');
  END IF;

  -- Valida todas as perguntas antes de criar qualquer registro.
  FOR v_answer IN
    SELECT value FROM jsonb_array_elements(p_answers)
  LOOP
    BEGIN
      v_question_id := (v_answer->>'question_id')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RETURN jsonb_build_object('error', 'invalid_question');
    END;

    IF v_question_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.diary_questions AS dq
       WHERE dq.id = v_question_id
         AND dq.diary_id = v_expected_diary_id
    ) THEN
      RETURN jsonb_build_object('error', 'invalid_question');
    END IF;
  END LOOP;

  SELECT id
    INTO v_entry_id
    FROM public.diary_entries
   WHERE user_id = v_client_id
     AND date = p_date;

  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'entry_exists', 'entry_id', v_entry_id);
  END IF;

  INSERT INTO public.diary_entries (user_id, diary_id, date)
  VALUES (v_client_id, v_expected_diary_id, p_date)
  RETURNING id INTO v_entry_id;

  FOR v_answer IN
    SELECT value FROM jsonb_array_elements(p_answers)
  LOOP
    v_question_id := (v_answer->>'question_id')::uuid;

    INSERT INTO public.entry_answers (entry_id, question_id, answer_text, answer_value)
    VALUES (
      v_entry_id,
      v_question_id,
      nullif(v_answer->>'answer_text', ''),
      CASE
        WHEN v_answer->>'answer_value' IS NOT NULL
          THEN (v_answer->>'answer_value')::numeric
        ELSE NULL
      END
    );
  END LOOP;

  RETURN jsonb_build_object('entry_id', v_entry_id);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Fixa search_path nas 10 SECURITY DEFINER que estavam mutáveis em produção.
-- ALTER FUNCTION preserva o corpo atual e reduz o risco de regressão funcional.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.check_account_role(text) SET search_path TO public;
ALTER FUNCTION public.delete_auth_user_on_profile_delete() SET search_path TO public;
ALTER FUNCTION public.get_client_last_login(uuid) SET search_path TO public;
ALTER FUNCTION public.get_clients_last_login() SET search_path TO public;
ALTER FUNCTION public.record_client_login() SET search_path TO public;
ALTER FUNCTION public.record_report_acknowledgment(uuid) SET search_path TO public;
ALTER FUNCTION public.record_report_view(uuid) SET search_path TO public;
ALTER FUNCTION public.record_smi_report_acknowledgment(uuid) SET search_path TO public;
ALTER FUNCTION public.record_smi_report_view(uuid) SET search_path TO public;
ALTER FUNCTION public.trigger_create_whatsapp_session() SET search_path TO public;

-- -----------------------------------------------------------------------------
-- 5. Default privileges para novas funções criadas pelo role postgres.
-- Novas funções deixam de nascer executáveis por usuários finais.
-- service_role permanece com o comportamento padrão do projeto.
-- Toda RPC pública/autenticada nova deve fazer GRANT explícito em sua migration.
-- -----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Grants explícitos das 21 SECURITY DEFINER atuais.
-- Primeiro removemos os grants externos; depois reabrimos apenas o necessário.
-- -----------------------------------------------------------------------------

-- Públicas por design: pré-login, links por token e formulário público.
REVOKE ALL ON FUNCTION public.check_account_role(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_account_role(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_client_diary_data(text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_diary_data(text, date) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_client_diary_entry(text, date, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_client_diary_entry(text, date, uuid, jsonb) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_lead(text, text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_lead(text, text, text, text, jsonb, text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.validate_client_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_client_token(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.validate_instrument_invite(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_instrument_invite(uuid, text) TO anon, authenticated, service_role;

-- Helper usado por RLS. Para não alterar semântica das policies nesta PR,
-- mantém EXECUTE para anon/authenticated; anon sempre recebe false com auth.uid() nulo.
REVOKE ALL ON FUNCTION public.is_therapist() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_therapist() TO anon, authenticated, service_role;

-- Apenas usuários autenticados. As funções administrativas validam therapist
-- internamente quando necessário.
REVOKE ALL ON FUNCTION public.delete_client(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_client(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_client_last_login(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_last_login(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_clients_last_login() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_clients_last_login() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_client_login() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_client_login() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_monthly_report_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_monthly_report_view(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_report_acknowledgment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_report_acknowledgment(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_report_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_report_view(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_session_report_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_session_report_view(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_smi_report_acknowledgment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_smi_report_acknowledgment(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_smi_report_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_smi_report_view(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_client_profile(uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_profile(uuid, text, text, text, text, uuid) TO authenticated, service_role;

-- Trigger-only: não devem ser RPCs chamáveis diretamente por clientes ou backend.
REVOKE ALL ON FUNCTION public.delete_auth_user_on_profile_delete() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.trigger_create_whatsapp_session() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.trigger_register_manychat_subscriber() FROM PUBLIC, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. Assertions de privilégio. Se a ACL efetiva ficar diferente da matriz,
-- a própria migration falha em vez de deixar uma configuração parcial.
-- -----------------------------------------------------------------------------
DO $assert$
BEGIN
  -- Públicas.
  IF NOT has_function_privilege('anon', 'public.check_account_role(text)', 'EXECUTE') OR
     NOT has_function_privilege('anon', 'public.get_client_diary_data(text,date)', 'EXECUTE') OR
     NOT has_function_privilege('anon', 'public.submit_client_diary_entry(text,date,uuid,jsonb)', 'EXECUTE') OR
     NOT has_function_privilege('anon', 'public.submit_lead(text,text,text,text,jsonb,text)', 'EXECUTE') OR
     NOT has_function_privilege('anon', 'public.validate_client_token(text)', 'EXECUTE') OR
     NOT has_function_privilege('anon', 'public.validate_instrument_invite(uuid,text)', 'EXECUTE') OR
     NOT has_function_privilege('anon', 'public.is_therapist()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR86: public RPC privilege matrix was not applied';
  END IF;

  -- Nunca disponíveis para anon.
  IF has_function_privilege('anon', 'public.delete_client(uuid)', 'EXECUTE') OR
     has_function_privilege('anon', 'public.get_client_last_login(uuid)', 'EXECUTE') OR
     has_function_privilege('anon', 'public.get_clients_last_login()', 'EXECUTE') OR
     has_function_privilege('anon', 'public.record_client_login()', 'EXECUTE') OR
     has_function_privilege('anon', 'public.record_monthly_report_view(uuid)', 'EXECUTE') OR
     has_function_privilege('anon', 'public.record_report_acknowledgment(uuid)', 'EXECUTE') OR
     has_function_privilege('anon', 'public.record_report_view(uuid)', 'EXECUTE') OR
     has_function_privilege('anon', 'public.record_session_report_view(uuid)', 'EXECUTE') OR
     has_function_privilege('anon', 'public.record_smi_report_acknowledgment(uuid)', 'EXECUTE') OR
     has_function_privilege('anon', 'public.record_smi_report_view(uuid)', 'EXECUTE') OR
     has_function_privilege('anon', 'public.update_client_profile(uuid,text,text,text,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR86: anon still has an authenticated/admin RPC privilege';
  END IF;

  -- Funções autenticadas precisam continuar disponíveis para o Portal.
  IF NOT has_function_privilege('authenticated', 'public.delete_client(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.get_client_last_login(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.get_clients_last_login()', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.record_client_login()', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.record_monthly_report_view(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.record_report_acknowledgment(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.record_report_view(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.record_session_report_view(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.record_smi_report_acknowledgment(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.record_smi_report_view(uuid)', 'EXECUTE') OR
     NOT has_function_privilege('authenticated', 'public.update_client_profile(uuid,text,text,text,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR86: authenticated RPC privilege matrix was not applied';
  END IF;

  -- Trigger-only não devem ser diretamente executáveis por roles externos.
  IF has_function_privilege('anon', 'public.delete_auth_user_on_profile_delete()', 'EXECUTE') OR
     has_function_privilege('authenticated', 'public.delete_auth_user_on_profile_delete()', 'EXECUTE') OR
     has_function_privilege('service_role', 'public.delete_auth_user_on_profile_delete()', 'EXECUTE') OR
     has_function_privilege('anon', 'public.trigger_create_whatsapp_session()', 'EXECUTE') OR
     has_function_privilege('authenticated', 'public.trigger_create_whatsapp_session()', 'EXECUTE') OR
     has_function_privilege('service_role', 'public.trigger_create_whatsapp_session()', 'EXECUTE') OR
     has_function_privilege('anon', 'public.trigger_register_manychat_subscriber()', 'EXECUTE') OR
     has_function_privilege('authenticated', 'public.trigger_register_manychat_subscriber()', 'EXECUTE') OR
     has_function_privilege('service_role', 'public.trigger_register_manychat_subscriber()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PR86: trigger-only function is still externally executable';
  END IF;

  -- Nenhuma SECURITY DEFINER do schema public pode ficar com search_path mutável.
  IF EXISTS (
    SELECT 1
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef = true
       AND NOT EXISTS (
         SELECT 1
           FROM unnest(coalesce(p.proconfig, '{}'::text[])) AS cfg
          WHERE cfg LIKE 'search_path=%'
       )
  ) THEN
    RAISE EXCEPTION 'PR86: SECURITY DEFINER function without fixed search_path remains';
  END IF;
END;
$assert$;
