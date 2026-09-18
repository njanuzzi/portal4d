-- Oficina de Roteiro — revisão crítica via IA (Edge Function `review-roteiro`).
--
-- Decisão da espec mudou desde a Fase 1: `source_text` agora É retido (o
-- botão "Extrair de novo" numa espec já salva depende dele), então a coluna
-- que já existia desde a migration original passa a ser preenchida. Isso
-- eleva a sensibilidade da tabela — RLS já restringe por user_id + role
-- therapist desde o primeiro deploy, não muda aqui.
--
-- `ai_review` guarda o parecer mais recente da IA por item do checklist
-- (5 objetos {ok, comment}, mesma ordem do array `checklist`). `ai_rewrite`
-- guarda a reescrita sugerida para os 6 campos. Os dois são só sugestão —
-- nunca sobrescrevem os campos/checklist reais sozinhos, a usuária decide
-- via "Usar esta versão" e o checkbox continua manual.

alter table public.roteiros
  add column if not exists ai_review jsonb,
  add column if not exists ai_rewrite jsonb,
  add column if not exists reviewed_at timestamptz;
