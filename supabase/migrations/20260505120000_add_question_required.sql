-- Marca se a pergunta é obrigatória no fechamento do dia
ALTER TABLE diary_questions
  ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT true;
