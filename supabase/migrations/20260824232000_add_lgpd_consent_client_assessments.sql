-- Registro de consentimento LGPD explícito do cliente ao iniciar o
-- Inventário de Esquemas nativo (antes só existia como bloco solto no
-- final do formulário do Tally, sem ficar gravado em lugar nenhum).
ALTER TABLE public.client_assessments ADD COLUMN lgpd_consent boolean;
