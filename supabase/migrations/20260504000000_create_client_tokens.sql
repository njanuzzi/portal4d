create extension if not exists pgcrypto;

create table if not exists public.client_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  token uuid not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists client_tokens_client_id_idx on public.client_tokens(client_id);
create index if not exists client_tokens_token_idx on public.client_tokens(token);
create index if not exists client_tokens_expires_at_idx on public.client_tokens(expires_at);

alter table public.client_tokens enable row level security;

drop policy if exists "Therapists can select client tokens" on public.client_tokens;
drop policy if exists "Therapists can insert client tokens" on public.client_tokens;
drop policy if exists "Therapists can update client tokens" on public.client_tokens;
drop policy if exists "Therapists can delete client tokens" on public.client_tokens;

create policy "Therapists can select client tokens"
  on public.client_tokens
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

create policy "Therapists can insert client tokens"
  on public.client_tokens
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

create policy "Therapists can update client tokens"
  on public.client_tokens
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles therapist
      where therapist.id = auth.uid()
        and therapist.role = 'therapist'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles therapist
      where therapist.id = auth.uid()
        and therapist.role = 'therapist'
    )
  );

create policy "Therapists can delete client tokens"
  on public.client_tokens
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

create or replace function public.validate_client_token(invite_token uuid)
returns table (
  client_id uuid,
  email text,
  name text,
  active boolean,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    profile.id as client_id,
    profile.email,
    profile.name,
    profile.active,
    token.expires_at
  from public.client_tokens token
  join public.profiles profile on profile.id = token.client_id
  where token.token = invite_token
    and token.expires_at > now()
    and profile.role = 'client'
    and profile.active = true
  order by token.created_at desc
  limit 1;
$$;

revoke all on function public.validate_client_token(uuid) from public;
grant execute on function public.validate_client_token(uuid) to anon, authenticated;
