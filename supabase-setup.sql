create table if not exists public.site_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  custom_css text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "public can read site content" on public.site_content;
create policy "public can read site content"
on public.site_content for select
to anon, authenticated
using (true);

drop policy if exists "authenticated admins can insert" on public.site_content;
create policy "authenticated admins can insert"
on public.site_content for insert
to authenticated
with check (true);

drop policy if exists "authenticated admins can update" on public.site_content;
create policy "authenticated admins can update"
on public.site_content for update
to authenticated
using (true)
with check (true);

insert into public.site_content (id, content, custom_css)
values ('main', '{}'::jsonb, '')
on conflict (id) do nothing;
