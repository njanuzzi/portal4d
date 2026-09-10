-- Vincula cada registro de diário à meta que estava vigente naquele dia,
-- pra dar pra montar o relatório de fechamento de 30 dias das metas
-- (quais dias foram preenchidos sob qual meta) sem precisar cruzar
-- datas manualmente.
alter table public.diary_entries
  add column goal_id uuid references public.client_goals(id) on delete set null;

-- Backfill: liga cada registro já existente à meta cujo ciclo cobria
-- aquele dia (confirmed_at <= date < closed_at, ou sem closed_at se
-- ainda era a meta vigente). Dias anteriores à primeira meta confirmada
-- ficam com goal_id null.
update public.diary_entries e
set goal_id = g.id
from public.client_goals g
where g.user_id = e.user_id
  and g.confirmed_at is not null
  and g.confirmed_at::date <= e.date
  and (g.closed_at is null or g.closed_at::date > e.date);
