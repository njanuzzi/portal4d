-- Escala de Crenças Românticas (RBS) — 13 itens, escala 1-7, 4 subescalas
-- (médias): amor_encontra_uma_maneira, amor_a_primeira_vista, um_e_unico,
-- idealizacao. Escala global = média das 4 subescalas. Mapeamento fixo em
-- src/lib/rbsScore.ts e supabase/functions/rbs-assessment-save.
create table if not exists public.rbs_questions (
  id uuid primary key default gen_random_uuid(),
  question_number int not null unique,
  question_text text not null
);

alter table public.rbs_questions enable row level security;

drop policy if exists "rbs_questions_select_all" on public.rbs_questions;
create policy "rbs_questions_select_all"
  on public.rbs_questions
  for select
  to public
  using (true);

insert into public.rbs_questions (question_number, question_text) values
  (1, 'Uma vez que eu experienciar o "amor verdadeiro", eu jamais poderei experienciá-lo novamente, no mesmo grau, com outra pessoa.'),
  (2, 'Eu acredito que estar verdadeiramente apaixonado(a) é estar apaixonado(a) para sempre.'),
  (3, 'Se eu estiver amando alguém, eu sei que poderei fazer o relacionamento funcionar, apesar de quaisquer obstáculos.'),
  (4, 'Quando eu achar meu "amor verdadeiro", eu provavelmente saberei disso assim que nos encontrarmos.'),
  (5, 'Tenho certeza que cada coisa nova que eu aprender sobre a pessoa que eu escolher para um relacionamento compromissado vai me agradar.'),
  (6, 'O relacionamento que eu tiver com meu "amor verdadeiro" será quase perfeito.'),
  (7, 'Se eu amar alguém, eu encontrarei uma maneira para ficarmos juntos(as) independente de oposições ao relacionamento, distância física ou qualquer outra barreira.'),
  (8, 'Haverá apenas um único amor verdadeiro para mim.'),
  (9, 'Se o relacionamento que eu tenho realmente "for para ser", qualquer obstáculo (p. ex., falta de dinheiro, distância física, conflitos de carreira) poderá ser superado.'),
  (10, 'É provável que eu me apaixone quase imediatamente, se eu conhecer a pessoa certa.'),
  (11, 'Eu espero que, no meu relacionamento, o amor romântico realmente dure e não vá enfraquecendo com o tempo.'),
  (12, 'A pessoa que eu amar vai ser um(a) parceiro(a) romântico(a) perfeito(a); por exemplo, ele(ela) vai ser completamente acolhedor(a), amoroso(a) e compreensível.'),
  (13, 'Eu acredito que se outra pessoa e eu nos amarmos, nós podemos superar quaisquer diferenças e problemas que possam surgir.')
on conflict (question_number) do nothing;

create table if not exists public.client_rbs_assessments (
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

create index if not exists client_rbs_assessments_client_id_idx on public.client_rbs_assessments(client_id);

alter table public.client_rbs_assessments enable row level security;

drop policy if exists "client_rbs_assessments_client_select_own" on public.client_rbs_assessments;
drop policy if exists "client_rbs_assessments_therapist_all" on public.client_rbs_assessments;

create policy "client_rbs_assessments_client_select_own"
  on public.client_rbs_assessments
  for select
  to public
  using (client_id = auth.uid());

create policy "client_rbs_assessments_therapist_all"
  on public.client_rbs_assessments
  for all
  to public
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'therapist'
    )
  );
