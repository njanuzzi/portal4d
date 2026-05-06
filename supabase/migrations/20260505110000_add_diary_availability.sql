-- Horário de disponibilidade do diário (ex: '18:00' até '23:59')
ALTER TABLE diaries
  ADD COLUMN IF NOT EXISTS available_from time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS available_to   time DEFAULT NULL;
