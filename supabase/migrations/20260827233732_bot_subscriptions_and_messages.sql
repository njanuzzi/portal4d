-- Fase 1 da V3 do bot (ver TECHNICAL_V3.md): assinatura paga + memória de conversa.
-- bot_subscriptions
create table public.bot_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null check (status in ('active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bot_subscriptions enable row level security;

create policy "client_read_own_subscription" on public.bot_subscriptions
  for select using (client_id = auth.uid());

create policy "therapist_read_subscriptions" on public.bot_subscriptions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'therapist')
  );

-- Sem policy de insert/update pra authenticated: só o webhook (service role) escreve aqui.

-- bot_messages: histórico da conversa (sem isso o chat esquece tudo ao recarregar a página)
create table public.bot_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.bot_messages enable row level security;

-- Só a própria cliente lê e escreve — sem policy nenhuma pra terapeuta aqui,
-- de propósito: "terapeuta vê só alertas" precisa estar garantido pelo banco.
create policy "client_own_messages" on public.bot_messages
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

create index bot_messages_client_id_idx on public.bot_messages (client_id, created_at);
