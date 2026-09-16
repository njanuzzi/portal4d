-- Inventário de Modos Esquemáticos (SMI) — tabelas próprias, paralelas ao
-- YSQ, para não colidir a numeração de perguntas (ambos numeram 1..N e o
-- YSQ já usa client_assessments.raw_answers indexado por question_number).
--
-- smi_mode_schema_links existe só pra deixar pronta a arquitetura de
-- "De/Para" entre os modos do SMI e os esquemas do YSQ — fica sem linhas
-- por enquanto, de propósito.

create table public.smi_modes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('crianca', 'enfrentamento_disfuncional', 'hipercompensador', 'pais_internalizados', 'adulto_saudavel')),
  question_count integer not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.smi_questions (
  id uuid primary key default gen_random_uuid(),
  mode_id uuid not null references public.smi_modes(id),
  question_number integer not null unique,
  question_text text not null,
  created_at timestamptz not null default now()
);

create table public.client_smi_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  source text not null default 'portal',
  submitted_at timestamptz,
  raw_answers jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'received', 'calculated')),
  version integer not null default 1,
  lgpd_consent boolean,
  wants_email_notification boolean,
  wants_whatsapp_notification boolean,
  created_at timestamptz not null default now()
);

create table public.client_smi_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.client_smi_assessments(id),
  mode_id uuid not null references public.smi_modes(id),
  raw_sum integer not null,
  average_score numeric not null,
  classification text,
  created_at timestamptz not null default now()
);

create table public.smi_mode_schema_links (
  id uuid primary key default gen_random_uuid(),
  smi_mode_id uuid not null references public.smi_modes(id),
  schema_domain_id uuid not null references public.schema_domains(id),
  is_hypothesis boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (smi_mode_id, schema_domain_id)
);

alter table public.smi_modes enable row level security;
alter table public.smi_questions enable row level security;
alter table public.client_smi_assessments enable row level security;
alter table public.client_smi_scores enable row level security;
alter table public.smi_mode_schema_links enable row level security;

create policy smi_modes_select_all on public.smi_modes for select using (true);
create policy smi_questions_select_all on public.smi_questions for select using (true);

create policy client_smi_assessments_therapist_all on public.client_smi_assessments for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'therapist')
);
create policy client_smi_assessments_client_select_own on public.client_smi_assessments for select using (
  client_id = auth.uid()
);

create policy client_smi_scores_therapist_all on public.client_smi_scores for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'therapist')
);
create policy client_smi_scores_client_select_own on public.client_smi_scores for select using (
  exists (select 1 from public.client_smi_assessments a where a.id = client_smi_scores.assessment_id and a.client_id = auth.uid())
);

create policy smi_mode_schema_links_therapist_all on public.smi_mode_schema_links for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'therapist')
);
