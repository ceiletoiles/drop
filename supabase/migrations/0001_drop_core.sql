create extension if not exists pgcrypto;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('text', 'file')),
  title text not null check (char_length(title) > 0 and char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.text_items (
  item_id uuid primary key references public.items (id) on delete cascade,
  content text not null
);

create table if not exists public.files (
  item_id uuid primary key references public.items (id) on delete cascade,
  storage_key text not null unique,
  original_name text not null,
  mime_type text not null,
  size bigint not null check (size > 0)
);

create index if not exists items_user_created_idx on public.items (user_id, created_at desc);
create index if not exists items_user_type_idx on public.items (user_id, type);
create index if not exists text_items_item_idx on public.text_items (item_id);
create index if not exists files_item_idx on public.files (item_id);
create index if not exists files_original_name_idx on public.files (original_name);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_touch_updated_at on public.items;
create trigger items_touch_updated_at
before update on public.items
for each row
execute function public.touch_updated_at();

alter table public.items enable row level security;
alter table public.text_items enable row level security;
alter table public.files enable row level security;

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own" on public.items
  for select
  using (auth.uid() = user_id);

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own" on public.items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own" on public.items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own" on public.items
  for delete
  using (auth.uid() = user_id);

drop policy if exists "text_select_own" on public.text_items;
create policy "text_select_own" on public.text_items
  for select
  using (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and public.items.user_id = auth.uid()
    )
  );

drop policy if exists "text_insert_own" on public.text_items;
create policy "text_insert_own" on public.text_items
  for insert
  with check (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and public.items.user_id = auth.uid()
    )
  );

drop policy if exists "text_update_own" on public.text_items;
create policy "text_update_own" on public.text_items
  for update
  using (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and public.items.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and public.items.user_id = auth.uid()
    )
  );

drop policy if exists "text_delete_own" on public.text_items;
create policy "text_delete_own" on public.text_items
  for delete
  using (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and public.items.user_id = auth.uid()
    )
  );

drop policy if exists "files_select_own" on public.files;
create policy "files_select_own" on public.files
  for select
  using (
    exists (
      select 1 from public.items
      where public.items.id = files.item_id
      and public.items.user_id = auth.uid()
    )
  );

drop policy if exists "files_insert_own" on public.files;
create policy "files_insert_own" on public.files
  for insert
  with check (
    exists (
      select 1 from public.items
      where public.items.id = files.item_id
      and public.items.user_id = auth.uid()
    )
  );

drop policy if exists "files_update_own" on public.files;
create policy "files_update_own" on public.files
  for update
  using (
    exists (
      select 1 from public.items
      where public.items.id = files.item_id
      and public.items.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.items
      where public.items.id = files.item_id
      and public.items.user_id = auth.uid()
    )
  );

drop policy if exists "files_delete_own" on public.files;
create policy "files_delete_own" on public.files
  for delete
  using (
    exists (
      select 1 from public.items
      where public.items.id = files.item_id
      and public.items.user_id = auth.uid()
    )
  );
