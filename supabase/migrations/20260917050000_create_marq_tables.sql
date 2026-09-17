-- Escala de Amor do Marriage and Relationships Questionnaire (MARQ) — 9
-- itens, escala 1-5, unidimensional (um único fator: vínculo emocional/amor
-- romântico). Diferente do BFI/SMI/YSQ, não há subconjuntos de perguntas por
-- fator — os dois "escores" (soma e média) usam as 9 perguntas inteiras, só
-- mudam a forma de agregar. Por isso não há tabela de fatores/domínios: o
-- cálculo vive em src/lib/marqScore.ts no frontend e em
-- supabase/functions/marq-assessment-save.
create table if not exists public.marq_questions (
  id uuid primary key default gen_random_uuid(),
  question_number int not null unique,
  question_text text not null
);

alter table public.marq_questions enable row level security;

drop policy if exists "marq_questions_select_all" on public.marq_questions;
create policy "marq_questions_select_all"
  on public.marq_questions
  for select
  to public
  using (true);

insert into public.marq_questions (question_number, question_text) values
  (1, 'Você gosta da companhia de sua(seu) parceira(o)?'),
  (2, 'Você é feliz com seu relacionamento?'),
  (3, 'Você acha sua(seu) parceira(o) atraente?'),
  (4, 'Vocês gostam de fazer coisas juntos?'),
  (5, 'Você gosta de ficar abraçado(a) com sua(seu) parceira(o)?'),
  (6, 'Você respeita sua(seu) parceira(o)?'),
  (7, 'Você se orgulha de sua(seu) parceira(o)?'),
  (8, 'Seu relacionamento tem um lado romântico?'),
  (9, 'Quanto você ama sua(seu) parceira(o)?')
on conflict (question_number) do nothing;

create table if not exists public.client_marq_assessments (
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

create index if not exists client_marq_assessments_client_id_idx on public.client_marq_assessments(client_id);

alter table public.client_marq_assessments enable row level security;

drop policy if exists "client_marq_assessments_client_select_own" on public.client_marq_assessments;
drop policy if exists "client_marq_assessments_therapist_all" on public.client_marq_assessments;

create policy "client_marq_assessments_client_select_own"
  on public.client_marq_assessments
  for select
  to public
  using (client_id = auth.uid());

create policy "client_marq_assessments_therapist_all"
  on public.client_marq_assessments
  for all
  to public
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'therapist'
    )
  );
