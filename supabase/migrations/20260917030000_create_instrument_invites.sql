-- Link individual por cliente para qualquer instrumento (Esquemas, SMI, e
-- futuros como BigFive/Relacionamento) — o terapeuta escolhe o cliente ANTES
-- de gerar o link, então o questionário público já sabe de quem é a resposta
-- sem precisar que o cliente digite nome/e-mail/WhatsApp (fluxo que hoje só
-- "adivinha" o cliente por e-mail ou WhatsApp+nome, e gerou bugs de cadastro
-- duplicado). O fluxo de auto-identificação continua existindo em paralelo
-- para quem ainda não tem link (ex: divulgação avulsa).
create table if not exists public.instrument_invites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  instrument text not null,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists instrument_invites_client_id_idx on public.instrument_invites(client_id);
create index if not exists instrument_invites_token_idx on public.instrument_invites(token);
create index if not exists instrument_invites_instrument_idx on public.instrument_invites(instrument);

alter table public.instrument_invites enable row level security;

drop policy if exists "Therapists can select instrument invites" on public.instrument_invites;
drop policy if exists "Therapists can insert instrument invites" on public.instrument_invites;
drop policy if exists "Therapists can delete instrument invites" on public.instrument_invites;

create policy "Therapists can select instrument invites"
  on public.instrument_invites
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles therapist
      where therapist.id = auth.uid()
        and therapist.role = 'therapist'
    )
  );

create policy "Therapists can insert instrument invites"
  on public.instrument_invites
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles therapist
      where therapist.id = auth.uid()
        and therapist.role = 'therapist'
    )
  );

create policy "Therapists can delete instrument invites"
  on public.instrument_invites
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles therapist
      where therapist.id = auth.uid()
        and therapist.role = 'therapist'
    )
  );

-- Validação pública (anon) do token — usada tanto pelo front (pra pular a
-- etapa de identidade e mostrar "preenchendo para: fulano") quanto pela
-- edge function de start de cada instrumento (fonte de verdade do client_id).
create or replace function public.validate_instrument_invite(p_token uuid, p_instrument text)
returns table (
  client_id uuid,
  name text,
  email text,
  whatsapp text,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    profile.id as client_id,
    profile.name,
    profile.email,
    profile.whatsapp,
    invite.expires_at
  from public.instrument_invites invite
  join public.profiles profile on profile.id = invite.client_id
  where invite.token = p_token
    and invite.instrument = p_instrument
    and invite.expires_at > now()
    and profile.role = 'client'
    and profile.active = true
  order by invite.created_at desc
  limit 1;
$$;

revoke all on function public.validate_instrument_invite(uuid, text) from public;
grant execute on function public.validate_instrument_invite(uuid, text) to anon, authenticated;
