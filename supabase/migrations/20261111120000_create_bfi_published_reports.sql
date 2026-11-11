-- Devolutiva do Big Five liberada pra cliente — espelha
-- client_smi_published_reports, mas sem a etapa de análise técnica gerada
-- por IA: a terapeuta edita o texto direto na tela de resposta do BFI e
-- libera. Enquanto não houver linha aqui, a cliente não vê nada do BFI.
--
-- Também marca em client_bfi_assessments.source = 'terapeuta' quando o
-- questionário foi aplicado pela terapeuta junto com a cliente (botão
-- "Aplicar agora com a cliente"), pra diferenciar das respostas feitas
-- sozinha.

create table public.client_bfi_published_reports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.client_bfi_assessments(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  content jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  acknowledged_at timestamptz
);

alter table public.client_bfi_published_reports enable row level security;

create policy client_bfi_published_reports_therapist_all on public.client_bfi_published_reports for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'therapist')
);
create policy client_bfi_published_reports_client_select_own on public.client_bfi_published_reports for select using (
  client_id = auth.uid()
);

create function public.record_bfi_report_view(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.client_bfi_published_reports
  set
    first_viewed_at = coalesce(first_viewed_at, now()),
    last_viewed_at  = now()
  where assessment_id = p_assessment_id and client_id = auth.uid();
end;
$$;

create function public.record_bfi_report_acknowledgment(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.client_bfi_published_reports
  set
    acknowledged_at = coalesce(acknowledged_at, now()),
    last_viewed_at  = now()
  where assessment_id = p_assessment_id and client_id = auth.uid();
end;
$$;

revoke execute on function public.record_bfi_report_view(uuid) from public, anon;
revoke execute on function public.record_bfi_report_acknowledgment(uuid) from public, anon;
grant execute on function public.record_bfi_report_view(uuid) to authenticated;
grant execute on function public.record_bfi_report_acknowledgment(uuid) to authenticated;
