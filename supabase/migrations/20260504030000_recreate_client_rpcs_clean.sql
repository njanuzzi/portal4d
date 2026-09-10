-- Drop every known overload of each function before recreating.
-- The remote client_tokens.token column is TEXT (not uuid), so all
-- p_token parameters must be TEXT to avoid "operator does not exist: text = uuid".

DROP FUNCTION IF EXISTS public.validate_client_token(uuid);
DROP FUNCTION IF EXISTS public.validate_client_token(text);

DROP FUNCTION IF EXISTS public.get_client_diary_data(uuid, date);
DROP FUNCTION IF EXISTS public.get_client_diary_data(date, uuid);
DROP FUNCTION IF EXISTS public.get_client_diary_data(text, date);
DROP FUNCTION IF EXISTS public.get_client_diary_data(date, text);
DROP FUNCTION IF EXISTS public.get_client_diary_data(uuid);
DROP FUNCTION IF EXISTS public.get_client_diary_data(text);

DROP FUNCTION IF EXISTS public.submit_client_diary_entry(uuid, date, uuid, jsonb);
DROP FUNCTION IF EXISTS public.submit_client_diary_entry(text, date, uuid, jsonb);

-- ------------------------------------------------------------
-- validate_client_token(p_token text)
-- p_token TEXT matches the actual remote client_tokens.token column type.
-- Returns one row on success, zero rows on failure.
-- Called by ClientAccess.tsx: .rpc('validate_client_token', { p_token: token })
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_client_token(p_token text)
RETURNS TABLE (
  client_id  uuid,
  email      text,
  name       text,
  active     boolean,
  expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    prof.id          AS client_id,
    prof.email,
    prof.name,
    prof.active,
    ct.expires_at
  FROM public.client_tokens AS ct
  JOIN public.profiles      AS prof ON prof.id = ct.client_id
  WHERE ct.token      = p_token
    AND ct.expires_at > now()
    AND prof.role     = 'client'
    AND prof.active   = true
  ORDER BY ct.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL  ON FUNCTION public.validate_client_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_client_token(text) TO anon, authenticated;

-- ------------------------------------------------------------
-- get_client_diary_data(p_token text, p_date date)
-- Returns jsonb. Error keys match frontend:
--   'invalid_token'   — bad/expired token
--   'no_active_diary' — no diary currently active
-- Called by ClientDiaryForm.tsx: .rpc('get_client_diary_data', { p_token, p_date })
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_client_diary_data(
  p_token text,
  p_date  date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id  uuid;
  v_diary_id   uuid;
  v_diary_name text;
  v_entry_id   uuid;
  v_questions  jsonb;
  v_answers    jsonb;
BEGIN
  SELECT ct.client_id
    INTO v_client_id
    FROM client_tokens AS ct
    JOIN profiles      AS prof ON prof.id = ct.client_id
   WHERE ct.token      = p_token
     AND ct.expires_at > now()
     AND prof.role     = 'client'
     AND prof.active   = true
   LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  SELECT id, name
    INTO v_diary_id, v_diary_name
    FROM diaries
   WHERE is_active = true
   LIMIT 1;

  IF v_diary_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_active_diary');
  END IF;

  SELECT id
    INTO v_entry_id
    FROM diary_entries
   WHERE user_id = v_client_id
     AND date    = p_date;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',        dq.id,
        'text',      dq.text,
        'type',      dq.type,
        'order_num', dq."order"
      )
      ORDER BY dq."order"
    ),
    '[]'::jsonb
  )
    INTO v_questions
    FROM diary_questions AS dq
   WHERE dq.diary_id = v_diary_id;

  IF v_entry_id IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'question_id',  ea.question_id,
          'answer_text',  ea.answer_text,
          'answer_value', ea.answer_value
        )
      ),
      '[]'::jsonb
    )
      INTO v_answers
      FROM entry_answers AS ea
     WHERE ea.entry_id = v_entry_id;
  END IF;

  RETURN jsonb_build_object(
    'client_id',        v_client_id,
    'diary',            jsonb_build_object('id', v_diary_id, 'name', v_diary_name),
    'questions',        v_questions,
    'today_entry_id',   v_entry_id,
    'existing_answers', v_answers
  );
END;
$$;

REVOKE ALL  ON FUNCTION public.get_client_diary_data(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_diary_data(text, date) TO anon, authenticated;

-- ------------------------------------------------------------
-- submit_client_diary_entry(p_token text, ...)
-- p_answers jsonb: [{question_id, answer_text, answer_value}]
-- Returns: {entry_id} on success, {error} on failure.
-- Called by ClientDiaryForm.tsx on form submit.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_client_diary_entry(
  p_token    text,
  p_date     date,
  p_diary_id uuid,
  p_answers  jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_entry_id  uuid;
  v_answer    jsonb;
BEGIN
  SELECT ct.client_id
    INTO v_client_id
    FROM client_tokens AS ct
    JOIN profiles      AS prof ON prof.id = ct.client_id
   WHERE ct.token      = p_token
     AND ct.expires_at > now()
     AND prof.role     = 'client'
     AND prof.active   = true
   LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  SELECT id
    INTO v_entry_id
    FROM diary_entries
   WHERE user_id = v_client_id
     AND date    = p_date;

  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'entry_exists', 'entry_id', v_entry_id);
  END IF;

  INSERT INTO diary_entries (user_id, diary_id, date)
  VALUES (v_client_id, p_diary_id, p_date)
  RETURNING id INTO v_entry_id;

  FOR v_answer IN
    SELECT value FROM jsonb_array_elements(p_answers)
  LOOP
    INSERT INTO entry_answers (entry_id, question_id, answer_text, answer_value)
    VALUES (
      v_entry_id,
      (v_answer->>'question_id')::uuid,
      NULLIF(v_answer->>'answer_text', ''),
      CASE
        WHEN v_answer->>'answer_value' IS NOT NULL
          THEN (v_answer->>'answer_value')::numeric
        ELSE NULL
      END
    );
  END LOOP;

  RETURN jsonb_build_object('entry_id', v_entry_id);
END;
$$;

REVOKE ALL  ON FUNCTION public.submit_client_diary_entry(text, date, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_diary_entry(text, date, uuid, jsonb) TO anon, authenticated;

-- Signal PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
