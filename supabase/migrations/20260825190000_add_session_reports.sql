-- Relatórios por sessão (um por data de sessão, puxados do Notion ou
-- adicionados manualmente), agrupados por mês/ano na tela do terapeuta.
-- Distinto de `reports`, que continua sendo o fechamento mensal/período.
create table if not exists session_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  session_date date not null,
  title text not null,
  content_html text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'revisado', 'publicado')),
  notion_session_id text,
  notion_session_url text,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evita duplicar a mesma sessão do Notion em re-sincronizações.
create unique index if not exists session_reports_notion_session_id_key
  on session_reports (notion_session_id) where notion_session_id is not null;
create index if not exists session_reports_client_id_idx on session_reports (client_id);

alter table session_reports enable row level security;

create policy "session_reports_therapist_all" on session_reports
  for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'therapist'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'therapist'));

create policy "session_reports_client_select_published" on session_reports
  for select
  using (client_id = auth.uid() and status = 'publicado');

-- Generaliza report_observations (hoje só usado pela devolutiva de esquemas)
-- pra também aceitar observações em relatórios de sessão. As policies
-- existentes já checam client_id/author_role direto na linha, sem depender
-- de qual tabela é a "dona" — não precisam mudar.
alter table report_observations alter column assessment_id drop not null;
alter table report_observations add column if not exists session_report_id uuid references session_reports(id) on delete cascade;
alter table report_observations add constraint report_observations_target_check
  check (
    (assessment_id is not null and session_report_id is null)
    or (assessment_id is null and session_report_id is not null)
  );
