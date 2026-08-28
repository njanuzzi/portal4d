-- Fase 2 da V3 do bot (ver TECHNICAL_V3.md): resumo clínico gerado pra alimentar o system prompt do
-- bot, nunca exibido cru pra ninguém — usado só como "pano de fundo" pra ele parecer que conhece a
-- cliente, sem citar sessão/relatório literalmente.
create table public.client_bot_context (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  summary_text text not null default '',
  sessions_considered integer not null default 0,
  generated_at timestamptz not null default now()
);

alter table public.client_bot_context enable row level security;

-- Terapeuta pode auditar o que o bot "sabe" se um dia for preciso; cliente lê o próprio (api/chat.ts
-- usa o JWT dela pra buscar isso, não service role). Escrita só pelo service role (generate-bot-context).
create policy "client_read_own_context" on public.client_bot_context
  for select using (client_id = auth.uid());

create policy "therapist_read_context" on public.client_bot_context
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'therapist')
  );
