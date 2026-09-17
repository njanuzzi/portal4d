-- Escala do Nível de Satisfação com o Relacionamento Amoroso - Revisada
-- (ENSRA-R) — 5 itens, escala 0-8, unidimensional. Escala global = média
-- direta dos 5 itens. Mapeamento fixo em src/lib/ensraScore.ts e
-- supabase/functions/ensra-assessment-save.
create table if not exists public.ensra_questions (
  id uuid primary key default gen_random_uuid(),
  question_number int not null unique,
  question_text text not null
);

alter table public.ensra_questions enable row level security;

drop policy if exists "ensra_questions_select_all" on public.ensra_questions;
create policy "ensra_questions_select_all"
  on public.ensra_questions
  for select
  to public
  using (true);

insert into public.ensra_questions (question_number, question_text) values
  (1, 'Eu me sinto satisfeito(a) com o nosso relacionamento.'),
  (2, 'Meu relacionamento está perto do ideal.'),
  (3, 'Nosso relacionamento me faz feliz.'),
  (4, 'Nosso relacionamento é perfeito.'),
  (5, 'Não mudaria nada em nosso relacionamento.')
on conflict (question_number) do nothing;

create table if not exists public.client_ensra_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'portal',
  submitted_at timestamptz not null default now(),
  raw_answers jsonb not null default '{}',
  status text not null default 'in_progress',
  version int not null default 1,
  lgpd_consent boolean,
  wants_email_notification boolean,
  wants_whatsapp_notification boolean,
  created_at timestamptz not null default now()
);

create index if not exists client_ensra_assessments_client_id_idx on public.client_ensra_assessments(client_id);

alter table public.client_ensra_assessments enable row level security;

drop policy if exists "client_ensra_assessments_client_select_own" on public.client_ensra_assessments;
drop policy if exists "client_ensra_assessments_therapist_all" on public.client_ensra_assessments;

create policy "client_ensra_assessments_client_select_own"
  on public.client_ensra_assessments
  for select
  to public
  using (client_id = auth.uid());

create policy "client_ensra_assessments_therapist_all"
  on public.client_ensra_assessments
  for all
  to public
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'therapist'
    )
  );
