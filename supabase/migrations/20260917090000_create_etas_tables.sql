-- Escala Triangular do Amor de Sternberg - Reduzida (ETAS-R) — 16 itens,
-- escala 1-5 (5 opções: Discordo fortemente ... Concordo fortemente), 3
-- subescalas (somas): compromisso, intimidade, paixao. Sem escala global —
-- o instrumento reporta as 3 dimensões separadamente. Mapeamento fixo em
-- src/lib/etasScore.ts e supabase/functions/etas-assessment-save.
create table if not exists public.etas_questions (
  id uuid primary key default gen_random_uuid(),
  question_number int not null unique,
  question_text text not null
);

alter table public.etas_questions enable row level security;

drop policy if exists "etas_questions_select_all" on public.etas_questions;
create policy "etas_questions_select_all"
  on public.etas_questions
  for select
  to public
  using (true);

insert into public.etas_questions (question_number, question_text) values
  (1, 'Espero que meu amor por meu companheiro(a) dure pelo resto da vida.'),
  (2, 'Não deixaria nada atrapalhar meu compromisso com meu companheiro(a).'),
  (3, 'Meu companheiro(a) pode contar comigo quando precisar.'),
  (4, 'Estou seguro do meu amor por meu companheiro(a).'),
  (5, 'Estou determinado a manter minha relação com meu companheiro(a).'),
  (6, 'Não deixaria que nada interferisse no meu compromisso com meu companheiro(a).'),
  (7, 'Eu sinto que eu realmente entendo meu companheiro(a).'),
  (8, 'Eu promovo ativamente o bem-estar de meu companheiro(a).'),
  (9, 'Eu recebo muito apoio emocional de meu companheiro(a).'),
  (10, 'Eu dou muito apoio emocional ao meu companheiro(a).'),
  (11, 'Tenho uma relação afetuosa com meu companheiro(a).'),
  (12, 'Eu tenho fantasias com meu companheiro(a).'),
  (13, 'Eu gosto muito do contato físico com meu companheiro(a).'),
  (14, 'Eu acho meu companheiro(a) muito atraente.'),
  (15, 'Só em olhar para meu companheiro(a) fico excitado(a).'),
  (16, 'Me pego pensando em meu companheiro(a) várias vezes durante o dia.')
on conflict (question_number) do nothing;

create table if not exists public.client_etas_assessments (
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

create index if not exists client_etas_assessments_client_id_idx on public.client_etas_assessments(client_id);

alter table public.client_etas_assessments enable row level security;

drop policy if exists "client_etas_assessments_client_select_own" on public.client_etas_assessments;
drop policy if exists "client_etas_assessments_therapist_all" on public.client_etas_assessments;

create policy "client_etas_assessments_client_select_own"
  on public.client_etas_assessments
  for select
  to public
  using (client_id = auth.uid());

create policy "client_etas_assessments_therapist_all"
  on public.client_etas_assessments
  for all
  to public
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'therapist'
    )
  );
