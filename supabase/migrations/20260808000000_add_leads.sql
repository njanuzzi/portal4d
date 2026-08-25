create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  source text not null,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists leads_source_idx on public.leads(source);
create index if not exists leads_created_at_idx on public.leads(created_at);

alter table public.leads enable row level security;

drop policy if exists "Therapists can select leads" on public.leads;

create policy "Therapists can select leads"
  on public.leads
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

-- No insert/update/delete policies: all writes go through submit_lead below.

create or replace function public.submit_lead(
  p_name text,
  p_email text,
  p_whatsapp text,
  p_source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  if p_source is null or length(trim(p_source)) = 0 then
    raise exception 'invalid source';
  end if;

  insert into public.leads (name, email, whatsapp, source)
  values (nullif(trim(p_name), ''), lower(trim(p_email)), nullif(trim(p_whatsapp), ''), p_source);
end;
$$;

revoke all on function public.submit_lead(text, text, text, text) from public;
grant execute on function public.submit_lead(text, text, text, text) to anon, authenticated;
