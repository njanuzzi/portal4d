-- Big Five Inventory (BFI) — versão em português, 25 itens, escala 1-5,
-- 5 fatores (Extroversão, Amabilidade, Conscienciosidade, Neuroticismo,
-- Abertura à Experiência). Diferente do SMI/YSQ, os itens não são divididos
-- em blocos temáticos no formulário (ordem mista é proposital do
-- instrumento original), então não há uma tabela de "domínios/fatores" —
-- o mapeamento pergunta→fator é fixo e vive em src/lib/bfiFactors.ts e em
-- supabase/functions/bfi-assessment-save, não no banco.
create table if not exists public.bfi_questions (
  id uuid primary key default gen_random_uuid(),
  question_number int not null unique,
  question_text text not null
);

alter table public.bfi_questions enable row level security;

drop policy if exists "bfi_questions_select_all" on public.bfi_questions;
create policy "bfi_questions_select_all"
  on public.bfi_questions
  for select
  to public
  using (true);

insert into public.bfi_questions (question_number, question_text) values
  (1, 'Gosta de conversar, é comunicativo(a).'),
  (2, 'É original, tem ideias novas.'),
  (3, 'É generoso(a) e não é egoísta com outras pessoas.'),
  (4, 'Pode ser desleixado(a) para fazer as coisas.'),
  (5, 'É tranquilo(a), lida bem com estresse.'),
  (6, 'Se interessa por áreas diferentes de conhecimento.'),
  (7, 'É cheio(a) de energia.'),
  (8, 'Pode ser tenso(a).'),
  (9, 'É inovador(a), pensa profundamente nas coisas.'),
  (10, 'Gera muito entusiasmo.'),
  (11, 'Desculpa, perdoa os outros.'),
  (12, 'Tende a ser desorganizado(a).'),
  (13, 'Se preocupa muito, em excesso.'),
  (14, 'Tende a ser preguiçoso(a).'),
  (15, 'É emocionalmente estável, não se perturba facilmente.'),
  (16, 'É inventivo(a).'),
  (17, 'É assertivo(a), não tem medo de expressar o que sente.'),
  (18, 'Persevera até concluir as tarefas.'),
  (19, 'É gentil e atencioso(a) com quase todo mundo.'),
  (20, 'Se mantém calmo(a) em situações tensas.'),
  (21, 'Fica nervoso(a) facilmente.'),
  (22, 'Tem poucos interesses artísticos.'),
  (23, 'Gosta de cooperar com outros.'),
  (24, 'Se distrai facilmente.'),
  (25, 'É sofisticado(a) em arte, música ou literatura.')
on conflict (question_number) do nothing;

create table if not exists public.client_bfi_assessments (
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

create index if not exists client_bfi_assessments_client_id_idx on public.client_bfi_assessments(client_id);

alter table public.client_bfi_assessments enable row level security;

drop policy if exists "client_bfi_assessments_client_select_own" on public.client_bfi_assessments;
drop policy if exists "client_bfi_assessments_therapist_all" on public.client_bfi_assessments;

create policy "client_bfi_assessments_client_select_own"
  on public.client_bfi_assessments
  for select
  to public
  using (client_id = auth.uid());

create policy "client_bfi_assessments_therapist_all"
  on public.client_bfi_assessments
  for all
  to public
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'therapist'
    )
  );
