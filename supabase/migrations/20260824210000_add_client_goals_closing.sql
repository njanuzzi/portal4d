-- Permite encerrar formalmente uma meta com observações antes de criar a
-- próxima, mantendo o histórico completo pro terapeuta acompanhar.
ALTER TABLE public.client_goals
  ADD COLUMN closed_at timestamptz,
  ADD COLUMN closing_notes text CHECK (closing_notes IS NULL OR char_length(closing_notes) <= 500);
