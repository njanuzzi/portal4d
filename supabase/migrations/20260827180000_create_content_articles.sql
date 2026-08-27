-- Biblioteca 4D: artigos públicos, redigidos somente pela terapeuta.
create or replace function public.is_therapist()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'therapist'
  );
$$;

create table if not exists public.content_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 4 and 180),
  excerpt text not null check (char_length(excerpt) between 20 and 360),
  content_html text not null,
  category text not null check (char_length(category) between 2 and 80),
  tags text[] not null default '{}',
  cover_image_url text,
  cover_image_alt text,
  author_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  faq jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_articles_published_requires_date check (status <> 'published' or published_at is not null)
);

create or replace function public.set_content_articles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists content_articles_public_index
  on public.content_articles (published_at desc)
  where status = 'published';

create index if not exists content_articles_category_index
  on public.content_articles (category);

drop trigger if exists set_content_articles_updated_at on public.content_articles;
create trigger set_content_articles_updated_at
  before update on public.content_articles
  for each row execute function public.set_content_articles_updated_at();

alter table public.content_articles enable row level security;

drop policy if exists "public reads published content articles" on public.content_articles;
create policy "public reads published content articles"
  on public.content_articles for select
  using (status = 'published' and published_at <= now());

drop policy if exists "therapist manages content articles" on public.content_articles;
create policy "therapist manages content articles"
  on public.content_articles for all to authenticated
  using (public.is_therapist())
  with check (public.is_therapist());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-images',
  'content-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "public reads content images" on storage.objects;
create policy "public reads content images"
  on storage.objects for select
  using (bucket_id = 'content-images');

drop policy if exists "therapist uploads content images" on storage.objects;
create policy "therapist uploads content images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'content-images' and public.is_therapist());

drop policy if exists "therapist updates content images" on storage.objects;
create policy "therapist updates content images"
  on storage.objects for update to authenticated
  using (bucket_id = 'content-images' and public.is_therapist())
  with check (bucket_id = 'content-images' and public.is_therapist());

drop policy if exists "therapist deletes content images" on storage.objects;
create policy "therapist deletes content images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'content-images' and public.is_therapist());
