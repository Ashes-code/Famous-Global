-- ============================================================
--  Famous Global — Supabase schema
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query
--  Then click "Run". No editing required.
-- ============================================================

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

-- 2) ITEMS TABLE ---------------------------------------------------------
create table if not exists public.items (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('graphic','gadget','video')),
  name         text not null,
  description  text,
  price        numeric,
  category     text,
  image_url    text,
  storage_path text,
  video_url    text,
  platform     text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists items_type_sort_idx on public.items (type, sort_order);

-- 3) ROW LEVEL SECURITY --------------------------------------------------
alter table public.items enable row level security;

drop policy if exists "items public read"  on public.items;
drop policy if exists "items owner insert" on public.items;
drop policy if exists "items owner update" on public.items;
drop policy if exists "items owner delete" on public.items;

create policy "items public read"
  on public.items for select
  using (true);

create policy "items owner insert"
  on public.items for insert
  with check (public.is_owner());

create policy "items owner update"
  on public.items for update
  using (public.is_owner())
  with check (public.is_owner());

create policy "items owner delete"
  on public.items for delete
  using (public.is_owner());

grant select on public.items to anon, authenticated;
grant insert, update, delete on public.items to authenticated;

-- 4) STORAGE BUCKET ------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read"  on storage.objects;
drop policy if exists "media owner insert" on storage.objects;
drop policy if exists "media owner update" on storage.objects;
drop policy if exists "media owner delete" on storage.objects;

create policy "media public read"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "media owner insert"
  on storage.objects for insert
  with check (bucket_id = 'media' and public.is_owner());

create policy "media owner update"
  on storage.objects for update
  using (bucket_id = 'media' and public.is_owner())
  with check (bucket_id = 'media' and public.is_owner());

create policy "media owner delete"
  on storage.objects for delete
  using (bucket_id = 'media' and public.is_owner());
