-- Oficina de Roteiro: extração automática dos 6 mecanismos de um roteiro de
-- artigo (cena, crença, mecanismo, termo, teste, fechamento) a partir de
-- texto bruto, via Edge Function `extract-roteiro`. Tabela de uso exclusivo
-- da terapeuta — RLS restringe por user_id E por role, já que só ela deve
-- ter acesso mesmo que o portal venha a ter outras usuárias no futuro.

create table if not exists public.roteiros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  cena text not null default '',
  crenca text not null default '',
  mecanismo text not null default '',
  termo text not null default '',
  teste text not null default '',
  fechamento text not null default '',
  checklist boolean[] not null default '{false,false,false,false,false}',
  source_text text,
  extracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roteiros_user_id_index
  on public.roteiros (user_id, created_at desc);

create or replace function public.set_roteiros_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_roteiros_updated_at on public.roteiros;
create trigger set_roteiros_updated_at
  before update on public.roteiros
  for each row execute function public.set_roteiros_updated_at();

alter table public.roteiros enable row level security;

drop policy if exists "usuaria_le_proprios_roteiros" on public.roteiros;
create policy "usuaria_le_proprios_roteiros"
  on public.roteiros for select to authenticated
  using (auth.uid() = user_id and public.is_therapist());

drop policy if exists "usuaria_edita_proprios_roteiros" on public.roteiros;
create policy "usuaria_edita_proprios_roteiros"
  on public.roteiros for all to authenticated
  using (auth.uid() = user_id and public.is_therapist())
  with check (auth.uid() = user_id and public.is_therapist());
