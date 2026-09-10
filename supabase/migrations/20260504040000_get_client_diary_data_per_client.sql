-- Update get_client_diary_data to use profiles.diary_id instead of the global
-- is_active flag. The client sees exactly the diary assigned to them, and only
-- if that diary is still active.

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
  -- Validate token and get client id
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

  -- Get the diary linked to this specific client (not any global active diary)
  SELECT d.id, d.name
    INTO v_diary_id, v_diary_name
    FROM profiles AS prof
    JOIN diaries  AS d ON d.id = prof.diary_id
   WHERE prof.id     = v_client_id
     AND d.is_active = true;

  IF v_diary_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_active_diary');
  END IF;

  -- Check for existing entry today
  SELECT id
    INTO v_entry_id
    FROM diary_entries
   WHERE user_id = v_client_id
     AND date    = p_date;

  -- Build questions array ordered by the "order" column
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

  -- Build existing answers only when an entry exists for today
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

NOTIFY pgrst, 'reload schema';
