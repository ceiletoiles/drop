alter table public.items
  add column if not exists expiration_type text not null default '24_HOURS',
  add column if not exists expires_at timestamptz;

create or replace function public.set_item_expiration()
returns trigger
language plpgsql
as $$
begin
  case new.expiration_type
    when 'CONSUME' then
      new.expires_at := null;
    when '24_HOURS' then
      new.expires_at := now() + interval '24 hours';
    when '7_DAYS' then
      new.expires_at := now() + interval '7 days';
    when '1_MONTH' then
      new.expires_at := now() + interval '1 month';
    else
      raise exception 'Invalid expiration type: %', new.expiration_type;
  end case;

  return new;
end;
$$;

drop trigger if exists items_set_expiration on public.items;
create trigger items_set_expiration
before insert or update of expiration_type
on public.items
for each row
execute function public.set_item_expiration();

update public.items
set
  expiration_type = '24_HOURS',
  expires_at = now() + interval '24 hours'
where expiration_type is distinct from 'CONSUME'
  and expires_at is null;

alter table public.items
  drop constraint if exists items_expiration_type_check;

alter table public.items
  add constraint items_expiration_type_check
  check (expiration_type in ('CONSUME', '24_HOURS', '7_DAYS', '1_MONTH'));

alter table public.items
  drop constraint if exists items_expiration_consistency_check;

alter table public.items
  add constraint items_expiration_consistency_check
  check (
    (expiration_type = 'CONSUME' and expires_at is null)
    or (expiration_type <> 'CONSUME' and expires_at is not null)
  );

create index if not exists items_user_expires_idx on public.items (user_id, expires_at desc);
create index if not exists items_expires_idx on public.items (expires_at);

create table if not exists public.storage_deletion_queue (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  item_id uuid,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('consume', 'expired', 'delete')),
  attempts integer not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists storage_deletion_queue_next_idx on public.storage_deletion_queue (next_attempt_at, created_at);

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own" on public.items
  for select
  using (auth.uid() = user_id and (expires_at is null or expires_at > now()));

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own" on public.items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own" on public.items
  for update
  using (auth.uid() = user_id and (expires_at is null or expires_at > now()))
  with check (auth.uid() = user_id and (expires_at is null or expires_at > now()));

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own" on public.items
  for delete
  using (auth.uid() = user_id and (expires_at is null or expires_at > now()));

drop policy if exists "text_select_own" on public.text_items;
create policy "text_select_own" on public.text_items
  for select
  using (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and public.items.user_id = auth.uid()
      and (public.items.expires_at is null or public.items.expires_at > now())
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
      and (public.items.expires_at is null or public.items.expires_at > now())
    )
  )
  with check (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and public.items.user_id = auth.uid()
      and (public.items.expires_at is null or public.items.expires_at > now())
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
      and (public.items.expires_at is null or public.items.expires_at > now())
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
      and (public.items.expires_at is null or public.items.expires_at > now())
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
      and (public.items.expires_at is null or public.items.expires_at > now())
    )
  )
  with check (
    exists (
      select 1 from public.items
      where public.items.id = files.item_id
      and public.items.user_id = auth.uid()
      and (public.items.expires_at is null or public.items.expires_at > now())
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
      and (public.items.expires_at is null or public.items.expires_at > now())
    )
  );
