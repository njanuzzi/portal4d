-- Adiciona coluna options (JSONB) para perguntas do tipo emotion
-- Estrutura: [{ "emoji": "😊", "label": "Alegre" }, ...]
ALTER TABLE diary_questions
  ADD COLUMN IF NOT EXISTS options jsonb DEFAULT NULL;
