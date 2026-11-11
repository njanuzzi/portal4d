-- Relatório técnico do Big Five (só para a terapeuta), gerado pelo Claude
-- automaticamente quando a cliente conclui o questionário
-- (bfi-assessment-save) e regerado/ajustado pela terapeuta na tela de
-- resposta (bfi-technical-report). Nunca é lido pela cliente — a devolutiva
-- dela fica em client_bfi_published_reports.
--
-- status: 'generating' enquanto o Claude escreve (a tela fica atualizando),
-- 'ready' quando há texto, 'error' se a geração falhou (error_message).

create table public.client_bfi_reports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.client_bfi_assessments(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  technical_content text,
  previous_content text,
  status text not null default 'generating' check (status in ('generating', 'ready', 'error')),
  error_message text,
  generated_with text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_bfi_reports enable row level security;

create policy client_bfi_reports_therapist_all on public.client_bfi_reports for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'therapist')
);
