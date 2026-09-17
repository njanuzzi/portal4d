-- Escala de Experiências em Relacionamentos Íntimos - Reduzida (ECR-R) — 10
-- itens, escala 1-7, 2 subescalas (somas): ansiedade, evitacao. Sem escala
-- global (o instrumento só reporta as duas subescalas). Mapeamento fixo em
-- src/lib/ecrScore.ts e supabase/functions/ecr-assessment-save.
create table if not exists public.ecr_questions (
  id uuid primary key default gen_random_uuid(),
  question_number int not null unique,
  question_text text not null
);

alter table public.ecr_questions enable row level security;

drop policy if exists "ecr_questions_select_all" on public.ecr_questions;
create policy "ecr_questions_select_all"
  on public.ecr_questions
  for select
  to public
  using (true);

insert into public.ecr_questions (question_number, question_text) values
  (1, 'Ajuda muito poder contar com meu(minha) parceiro(a) em momentos de necessidade.'),
  (2, 'Eu preciso de muitas garantias de que sou amado por meu(minha) parceiro(a).'),
  (3, 'Eu recorro ao(à) meu(minha) parceiro(a) para muitas coisas, incluindo para conforto e segurança emocional.'),
  (4, 'Frequentemente, eu acho que meu(minha) parceiro(a) não quer tanta proximidade afetiva quanto eu gostaria.'),
  (5, 'Geralmente, tento evitar muita proximidade afetiva com meu(minha) parceiro(a).'),
  (6, 'Às vezes, meu desejo de ficar muito próximo afetivamente acaba assustando as pessoas.'),
  (7, 'Eu costumo conversar sobre os meus problemas e preocupações com meu(minha) parceiro(a).'),
  (8, 'Eu fico frustrado se meu(minha) parceiro(a) não está disponível quando eu preciso dele(a).'),
  (9, 'Eu fico preocupado quando meu(minha) parceiro(a) fica muito próximo afetivamente de mim.'),
  (10, 'Preocupa-me que meu(minha) parceiro(a) não se importe comigo tanto quanto eu me importo com ele(a).')
on conflict (question_number) do nothing;

create table if not exists public.client_ecr_assessments (
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

create index if not exists client_ecr_assessments_client_id_idx on public.client_ecr_assessments(client_id);

alter table public.client_ecr_assessments enable row level security;

drop policy if exists "client_ecr_assessments_client_select_own" on public.client_ecr_assessments;
drop policy if exists "client_ecr_assessments_therapist_all" on public.client_ecr_assessments;

create policy "client_ecr_assessments_client_select_own"
  on public.client_ecr_assessments
  for select
  to public
  using (client_id = auth.uid());

create policy "client_ecr_assessments_therapist_all"
  on public.client_ecr_assessments
  for all
  to public
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'therapist'
    )
  );
