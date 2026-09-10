-- Permite que vários diários fiquem "ativos" (disponíveis para vínculo)
-- simultaneamente. Antes, um trigger forçava só 1 diário ativo no sistema
-- inteiro; agora cada cliente recebe um diário específico via
-- profiles.diary_id, então a exclusividade deixou de fazer sentido.
DROP TRIGGER IF EXISTS trigger_single_active_diary ON diaries;
DROP FUNCTION IF EXISTS enforce_single_active_diary();
