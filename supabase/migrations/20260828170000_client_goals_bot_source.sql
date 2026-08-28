-- Fase 4 da V3 do bot: suporte a metas sugeridas pelo bot, sem duplicar a lógica de ciclo semanal que
-- já existe em DiaryPage.tsx. O bot só propõe (source='bot', confirmed_at=null); a cliente confirma pela
-- tela dela, e só nesse momento a meta passa a valer pro ciclo (ver ClientHome.tsx).
alter table public.client_goals add column source text not null default 'client' check (source in ('client', 'bot'));
alter table public.client_goals add column confirmed_at timestamptz;

-- Backfill: toda meta que já existe foi criada pela própria cliente, então já vale.
update public.client_goals set confirmed_at = created_at where source = 'client';
