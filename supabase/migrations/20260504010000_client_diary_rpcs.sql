/*
  # Client diary RPCs for token-based (magic link) access

  Clients access the diary without a Supabase auth session.
  These SECURITY DEFINER functions bypass RLS by validating the
  invite token themselves.

  1. get_client_diary_data(p_token, p_date)
     - Validates token, returns active diary + questions + any existing
       entry for the given date (so the form can show "already filled").

  2. submit_client_diary_entry(p_token, p_date, p_diary_id, p_answers)
     - Validates token, inserts diary_entry + entry_answers atomically.
     - Returns entry_id on success or an error key on failure.
*/

-- ==========================================
-- get_client_diary_data
-- ==========================================
create or replace function public.get_client_diary_data(
  p_token uuid,
  p_date  date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_diary_id  uuid;
  v_entry_id  uuid;
  v_result    jsonb;
begin
  -- Validate token
  select ct.client_id into v_client_id
  from client_tokens ct
  join profiles p on p.id = ct.client_id
  where ct.token = p_token
    and ct.expires_at > now()
    and p.role = 'client'
    and p.active = true
  limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- Get active diary
  select id into v_diary_id from diaries where is_active = true limit 1;

  if v_diary_id is null then
    return jsonb_build_object('error', 'no_active_diary');
  end if;

  -- Check for existing entry on p_date
  select id into v_entry_id
  from diary_entries
  where user_id = v_client_id and date = p_date;

  select jsonb_build_object(
    'client_id', v_client_id,
    'diary', jsonb_build_object('id', d.id, 'name', d.name),
    'questions', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',        q.id,
            'text',      q.text,
            'type',      q.type,
            'order_num', q."order"
          )
          order by q."order"
        )
        from diary_questions q
        where q.diary_id = d.id
      ),
      '[]'::jsonb
    ),
    'today_entry_id', v_entry_id,
    'existing_answers', case
      when v_entry_id is not null then (
        select coalesce(
          jsonb_agg(jsonb_build_object(
            'question_id',  a.question_id,
            'answer_text',  a.answer_text,
            'answer_value', a.answer_value
          )),
          '[]'::jsonb
        )
        from entry_answers a
        where a.entry_id = v_entry_id
      )
      else null
    end
  ) into v_result
  from diaries d
  where d.id = v_diary_id;

  return v_result;
end;
$$;

revoke all on function public.get_client_diary_data(uuid, date) from public;
grant execute on function public.get_client_diary_data(uuid, date) to anon, authenticated;

-- ==========================================
-- submit_client_diary_entry
-- ==========================================
create or replace function public.submit_client_diary_entry(
  p_token    uuid,
  p_date     date,
  p_diary_id uuid,
  p_answers  jsonb  -- [{question_id, answer_text, answer_value}]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_entry_id  uuid;
  v_answer    jsonb;
begin
  -- Validate token
  select ct.client_id into v_client_id
  from client_tokens ct
  join profiles p on p.id = ct.client_id
  where ct.token = p_token
    and ct.expires_at > now()
    and p.role = 'client'
    and p.active = true
  limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- Guard: entry already submitted
  select id into v_entry_id
  from diary_entries
  where user_id = v_client_id and date = p_date;

  if v_entry_id is not null then
    return jsonb_build_object('error', 'entry_exists', 'entry_id', v_entry_id);
  end if;

  -- Create entry
  insert into diary_entries (user_id, diary_id, date)
  values (v_client_id, p_diary_id, p_date)
  returning id into v_entry_id;

  -- Insert answers
  for v_answer in select * from jsonb_array_elements(p_answers) loop
    insert into entry_answers (entry_id, question_id, answer_text, answer_value)
    values (
      v_entry_id,
      (v_answer->>'question_id')::uuid,
      nullif(v_answer->>'answer_text', ''),
      case
        when v_answer->>'answer_value' is not null
          then (v_answer->>'answer_value')::numeric
        else null
      end
    );
  end loop;

  return jsonb_build_object('entry_id', v_entry_id);
end;
$$;

revoke all on function public.submit_client_diary_entry(uuid, date, uuid, jsonb) from public;
grant execute on function public.submit_client_diary_entry(uuid, date, uuid, jsonb) to anon, authenticated;
