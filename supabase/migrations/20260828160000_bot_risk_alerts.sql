-- Fase 3 da V3 do bot: alerta de risco — categoria e resumo curto gerado pelo próprio bot, nunca a
-- conversa inteira. A terapeuta vê só isso, nunca o histórico de bot_messages (ver Decisões Técnicas
-- do TECHNICAL_V3.md).
create table public.bot_risk_alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('ideacao_suicida', 'autolesao', 'risco_generico')),
  safe_summary text not null check (char_length(safe_summary) <= 300),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bot_risk_alerts enable row level security;

-- A própria cliente (via JWT, dentro de api/chat.ts) grava o alerta quando o bot chama a tool —
-- mas nunca lê de volta, só a terapeuta.
create policy "client_insert_own_risk_alert" on public.bot_risk_alerts
  for insert with check (client_id = auth.uid());

create policy "therapist_manage_risk_alerts" on public.bot_risk_alerts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'therapist')
  );

create index bot_risk_alerts_unacknowledged_idx
  on public.bot_risk_alerts (created_at desc) where acknowledged_at is null;
