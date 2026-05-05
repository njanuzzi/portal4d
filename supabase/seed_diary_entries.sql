-- =============================================================
-- SEED: Duas semanas de registros de diário
-- =============================================================
-- Como usar: cole e execute no SQL Editor do Supabase.
--
-- O que faz:
--   - Busca o diário ativo e os dois primeiros clientes ativos
--   - Cliente 1 → registros de hoje-14 até hoje-2  (2 dias pendente  → âmbar)
--   - Cliente 2 → registros de hoje-14 até hoje-5  (5 dias pendente  → vermelho)
--   - Pula datas que já têm registro (idempotente — pode rodar mais de uma vez)
--   - Gera respostas realistas para cada tipo de pergunta
-- =============================================================

DO $$
DECLARE
  v_diary_id      uuid;
  v_client_ids    uuid[];
  v_client_id     uuid;
  v_entry_id      uuid;
  v_date          date;
  v_question      record;
  v_day_offset    integer;
  v_gap           integer;
  v_scale_val     integer;
  v_text          text;
  i               integer;

  -- Textos rotativos para perguntas abertas
  v_texts text[] := ARRAY[
    'Hoje foi um dia desafiador, mas consegui me manter focada e cumprir o que precisava.',
    'Senti que progredi bem. As práticas estão fazendo diferença no meu dia a dia.',
    'Tive dificuldades para manter a concentração pela manhã, mas o resto do dia fluiu melhor.',
    'Me senti mais leve hoje. Conversar com pessoas próximas me ajudou bastante.',
    'Dia produtivo. Consegui cumprir minhas metas e ainda reservei um tempo para descanso.',
    'Senti ansiedade no início do dia, mas foi diminuindo conforme a tarde avançou.',
    'Boa noite de sono se refletiu no meu humor. Me senti mais disposta e presente.',
    'Me dediquei aos exercícios e me senti muito bem depois. Vale sempre a pena.',
    'Pratiquei a respiração diafragmática nos momentos de tensão e ajudou muito.',
    'Me senti sobrecarregada no trabalho, precisei de pausas para não perder o foco.',
    'Consegui identificar um padrão de pensamento negativo e questionar antes de reagir.',
    'Dia tranquilo. Aproveitei para refletir sobre a semana e reconhecer meu progresso.',
    'Senti dificuldade em lidar com uma situação difícil, mas persisti sem me culpar depois.',
    'Pratiquei gratidão antes de dormir. O dia pareceu mais leve quando olhei assim.'
  ];

BEGIN

  -- ── 1. Valida diário ativo ────────────────────────────────────
  SELECT id INTO v_diary_id
  FROM diaries
  WHERE is_active = true
  LIMIT 1;

  IF v_diary_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum diário ativo encontrado. Ative um diário antes de rodar o seed.';
  END IF;

  RAISE NOTICE 'Diário ativo encontrado: %', v_diary_id;

  -- ── 2. Busca até 2 clientes ativos ───────────────────────────
  SELECT ARRAY(
    SELECT id FROM profiles
    WHERE role = 'client' AND active = true
    ORDER BY created_at
    LIMIT 2
  ) INTO v_client_ids;

  IF v_client_ids IS NULL OR array_length(v_client_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhum cliente ativo encontrado. Cadastre pelo menos um cliente antes.';
  END IF;

  RAISE NOTICE 'Clientes encontrados: %', array_length(v_client_ids, 1);

  -- ── 3. Itera sobre os clientes ───────────────────────────────
  FOR i IN 1..array_length(v_client_ids, 1) LOOP
    v_client_id := v_client_ids[i];

    -- Quantos dias de gap (dias recentes sem resposta)
    v_gap := CASE WHEN i = 1 THEN 2 ELSE 5 END;

    RAISE NOTICE 'Cliente % — inserindo de hoje-14 até hoje-% ...', i, v_gap;

    FOR v_day_offset IN v_gap..14 LOOP
      v_date := CURRENT_DATE - v_day_offset;

      -- Idempotência: pula se já existe registro nessa data
      IF EXISTS (
        SELECT 1 FROM diary_entries
        WHERE user_id = v_client_id AND date = v_date
      ) THEN
        CONTINUE;
      END IF;

      -- Insere a entrada do dia
      INSERT INTO diary_entries (id, user_id, diary_id, date)
      VALUES (gen_random_uuid(), v_client_id, v_diary_id, v_date)
      RETURNING id INTO v_entry_id;

      -- Texto rotativo baseado no dia + cliente (sem randomness pura → reproduzível)
      v_text := v_texts[1 + ((v_day_offset + i * 3 - 1) % array_length(v_texts, 1))];

      -- Insere resposta para cada pergunta do diário
      FOR v_question IN
        SELECT id, type, order_num
        FROM diary_questions
        WHERE diary_id = v_diary_id
        ORDER BY order_num
      LOOP
        -- Escala: valores entre 5 e 9 (progresso realista, pequena variação)
        v_scale_val := 5 + ((v_day_offset + i + v_question.order_num) % 5);

        INSERT INTO entry_answers (id, entry_id, question_id, answer_text, answer_value)
        VALUES (
          gen_random_uuid(),
          v_entry_id,
          v_question.id,
          CASE v_question.type
            WHEN 'text'   THEN v_text
            WHEN 'number' THEN NULL
            ELSE NULL
          END,
          CASE v_question.type
            WHEN 'scale'  THEN v_scale_val
            WHEN 'number' THEN 1 + ((v_day_offset * i + v_question.order_num) % 8)
            ELSE NULL
          END
        );
      END LOOP;

    END LOOP;

    RAISE NOTICE 'Cliente % concluído.', i;
  END LOOP;

  RAISE NOTICE '✓ Seed finalizado. % cliente(s) populado(s) com até 13 registros cada.',
    array_length(v_client_ids, 1);

END $$;
