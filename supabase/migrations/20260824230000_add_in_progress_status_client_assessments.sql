-- Permite salvar progresso parcial do Inventário de Esquemas nativo (por
-- domínio, antes de calcular os scores) sem violar o CHECK de status.
ALTER TABLE public.client_assessments DROP CONSTRAINT client_assessments_status_check;
ALTER TABLE public.client_assessments ADD CONSTRAINT client_assessments_status_check
  CHECK (status = ANY (ARRAY['in_progress'::text, 'received'::text, 'calculated'::text, 'reviewed'::text, 'published'::text]));
