-- Análise técnica (terapeuta) + devolutiva publicada (cliente) do SMI —
-- espelha client_schema_reports/client_published_reports do YSQ, em
-- tabelas próprias porque apontam pra client_smi_assessments, não
-- client_assessments.

create table public.client_smi_reports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.client_smi_assessments(id),
  client_id uuid not null references public.profiles(id),
  technical_content text,
  previous_content text,
  client_content jsonb,
  previous_client_content jsonb,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published')),
  client_content_status text not null default 'draft' check (client_content_status in ('draft', 'reviewed', 'published')),
  generated_with text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_smi_published_reports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.client_smi_assessments(id),
  client_id uuid not null references public.profiles(id),
  content jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  acknowledged_at timestamptz
);

alter table public.client_smi_reports enable row level security;
alter table public.client_smi_published_reports enable row level security;

create policy client_smi_reports_therapist_all on public.client_smi_reports for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'therapist')
);
create policy client_smi_reports_client_select_own on public.client_smi_reports for select using (
  client_id = auth.uid()
);

create policy client_smi_published_reports_therapist_all on public.client_smi_published_reports for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'therapist')
);
create policy client_smi_published_reports_client_select_own on public.client_smi_published_reports for select using (
  client_id = auth.uid()
);

create function public.record_smi_report_view(p_assessment_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.client_smi_published_reports
  set
    first_viewed_at = coalesce(first_viewed_at, now()),
    last_viewed_at  = now()
  where assessment_id = p_assessment_id and client_id = auth.uid();
end;
$$;

create function public.record_smi_report_acknowledgment(p_assessment_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.client_smi_published_reports
  set
    acknowledged_at = coalesce(acknowledged_at, now()),
    last_viewed_at  = now()
  where assessment_id = p_assessment_id and client_id = auth.uid();
end;
$$;
