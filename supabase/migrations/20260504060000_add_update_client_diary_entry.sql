-- update_client_diary_entry: replaces all answers for an existing entry.
-- Handles edited answers and new questions added to the diary after initial submission.
-- Deletes current answers and re-inserts the full set sent by the client.

CREATE OR REPLACE FUNCTION public.update_client_diary_entry(
  p_token    text,
  p_entry_id uuid,
  p_answers  jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_answer    jsonb;
BEGIN
  -- Validate token
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

  -- Verify the entry belongs to this client
  IF NOT EXISTS (
    SELECT 1 FROM diary_entries
     WHERE id = p_entry_id AND user_id = v_client_id
  ) THEN
    RETURN jsonb_build_object('error', 'entry_not_found');
  END IF;

  -- Replace all answers
  DELETE FROM entry_answers WHERE entry_id = p_entry_id;

  FOR v_answer IN
    SELECT value FROM jsonb_array_elements(p_answers)
  LOOP
    INSERT INTO entry_answers (entry_id, question_id, answer_text, answer_value)
    VALUES (
      p_entry_id,
      (v_answer->>'question_id')::uuid,
      NULLIF(v_answer->>'answer_text', ''),
      CASE
        WHEN v_answer->>'answer_value' IS NOT NULL
          THEN (v_answer->>'answer_value')::numeric
        ELSE NULL
      END
    );
  END LOOP;

  RETURN jsonb_build_object('entry_id', p_entry_id);
END;
$$;

REVOKE ALL  ON FUNCTION public.update_client_diary_entry(text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_client_diary_entry(text, uuid, jsonb) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
