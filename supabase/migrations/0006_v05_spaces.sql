create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) > 0 and char_length(name) <= 120),
  owner_id uuid not null references auth.users (id) on delete cascade,
  owner_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items
  add column if not exists space_id uuid references public.spaces (id) on delete restrict;

create table if not exists public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.space_invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  invited_email text,
  invited_by uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists spaces_owner_idx on public.spaces (owner_id, created_at desc);
create index if not exists space_members_user_idx on public.space_members (user_id, joined_at desc);
create index if not exists space_members_space_idx on public.space_members (space_id, joined_at desc);
create index if not exists space_invitations_space_idx on public.space_invitations (space_id, created_at desc);
create index if not exists items_space_idx on public.items (space_id, created_at desc);
create unique index if not exists space_invitations_active_link_idx
  on public.space_invitations (space_id)
  where invited_email is null and revoked_at is null;

drop trigger if exists spaces_touch_updated_at on public.spaces;
create trigger spaces_touch_updated_at
before update on public.spaces
for each row
execute function public.touch_updated_at();

create or replace function public.is_space_member(p_space_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = p_space_id
      and user_id = p_user_id
  );
$$;

create or replace function public.create_space(p_owner_id uuid, p_owner_name text, p_name text)
returns public.spaces
language plpgsql
security definer
set search_path = public
as $$
declare
  space_row public.spaces;
begin
  insert into public.spaces (name, owner_id, owner_name)
  values (trim(p_name), p_owner_id, trim(p_owner_name))
  returning * into space_row;

  insert into public.space_members (space_id, user_id, display_name, role)
  values (space_row.id, p_owner_id, trim(p_owner_name), 'owner');

  return space_row;
end;
$$;

create or replace function public.create_space_invitation(
  p_space_id uuid,
  p_invited_by uuid,
  p_invited_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns public.space_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.space_invitations;
begin
  insert into public.space_invitations (space_id, invited_email, invited_by, token_hash, expires_at)
  values (p_space_id, nullif(lower(trim(p_invited_email)), ''), p_invited_by, p_token_hash, p_expires_at)
  returning * into invite_row;

  return invite_row;
end;
$$;

create or replace function public.join_space_invitation(
  p_token_hash text,
  p_user_id uuid,
  p_user_email text,
  p_display_name text
)
returns table (space_id uuid, joined boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.space_invitations;
  inserted_count integer := 0;
begin
  select *
  into invite_row
  from public.space_invitations
  where token_hash = p_token_hash
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Invitation expired.';
  end if;

  if invite_row.invited_email is not null and lower(trim(invite_row.invited_email)) <> lower(trim(coalesce(p_user_email, ''))) then
    raise exception 'Invitation is for a different email.';
  end if;

  insert into public.space_members (space_id, user_id, display_name, role)
  values (invite_row.space_id, p_user_id, trim(p_display_name), 'member')
  on conflict do nothing;

  get diagnostics inserted_count = row_count;

  if invite_row.invited_email is not null and invite_row.accepted_at is null then
    update public.space_invitations
      set accepted_at = now()
      where id = invite_row.id;
  end if;

  space_id := invite_row.space_id;
  joined := inserted_count > 0;
  return next;
end;
$$;

create or replace function public.set_item_expiration()
returns trigger
language plpgsql
as $$
begin
  if new.space_id is not null and new.expiration_type = 'CONSUME' then
    raise exception 'Space items must use time-based expiration.';
  end if;

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
before insert or update of expiration_type, space_id
on public.items
for each row
execute function public.set_item_expiration();

alter table public.items
  drop constraint if exists items_expiration_type_check;

alter table public.items
  add constraint items_expiration_type_check
  check (
    (space_id is null and expiration_type in ('CONSUME', '24_HOURS', '7_DAYS', '1_MONTH'))
    or (space_id is not null and expiration_type in ('24_HOURS', '7_DAYS', '1_MONTH'))
  );

alter table public.items
  drop constraint if exists items_expiration_consistency_check;

alter table public.items
  add constraint items_expiration_consistency_check
  check (
    (space_id is null and expiration_type = 'CONSUME' and expires_at is null)
    or (space_id is null and expiration_type <> 'CONSUME' and expires_at is not null)
    or (space_id is not null and expiration_type <> 'CONSUME' and expires_at is not null)
  );

alter table public.items
  drop constraint if exists items_space_id_fkey;

alter table public.items
  add constraint items_space_id_fkey foreign key (space_id) references public.spaces (id) on delete restrict;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_invitations enable row level security;

drop policy if exists "spaces_select_member" on public.spaces;
create policy "spaces_select_member" on public.spaces
  for select
  using (public.is_space_member(id, auth.uid()));

drop policy if exists "spaces_insert_owner" on public.spaces;
create policy "spaces_insert_owner" on public.spaces
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "spaces_update_owner" on public.spaces;
create policy "spaces_update_owner" on public.spaces
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "spaces_delete_owner" on public.spaces;
create policy "spaces_delete_owner" on public.spaces
  for delete
  using (auth.uid() = owner_id);

drop policy if exists "space_members_select_member" on public.space_members;
create policy "space_members_select_member" on public.space_members
  for select
  using (public.is_space_member(space_id, auth.uid()));

drop policy if exists "space_members_insert_member" on public.space_members;
create policy "space_members_insert_member" on public.space_members
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "space_members_update_member" on public.space_members;
create policy "space_members_update_member" on public.space_members
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "space_members_delete_member" on public.space_members;
create policy "space_members_delete_member" on public.space_members
  for delete
  using (auth.uid() = user_id);

drop policy if exists "space_invitations_select_member" on public.space_invitations;
create policy "space_invitations_select_member" on public.space_invitations
  for select
  using (public.is_space_member(space_id, auth.uid()));

drop policy if exists "space_invitations_insert_member" on public.space_invitations;
create policy "space_invitations_insert_member" on public.space_invitations
  for insert
  with check (auth.uid() = invited_by);

drop policy if exists "space_invitations_update_member" on public.space_invitations;
create policy "space_invitations_update_member" on public.space_invitations
  for update
  using (public.is_space_member(space_id, auth.uid()))
  with check (public.is_space_member(space_id, auth.uid()));

drop policy if exists "space_invitations_delete_member" on public.space_invitations;
create policy "space_invitations_delete_member" on public.space_invitations
  for delete
  using (public.is_space_member(space_id, auth.uid()));

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own" on public.items
  for select
  using (
    (
      space_id is null
      and auth.uid() = user_id
      and (expires_at is null or expires_at > now())
    )
    or (
      space_id is not null
      and (expires_at is null or expires_at > now())
      and public.is_space_member(space_id, auth.uid())
    )
  );

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own" on public.items
  for insert
  with check (
    auth.uid() = user_id
    and (
      (space_id is null and expiration_type in ('CONSUME', '24_HOURS', '7_DAYS', '1_MONTH'))
      or (space_id is not null and expiration_type in ('24_HOURS', '7_DAYS', '1_MONTH') and public.is_space_member(space_id, auth.uid()))
    )
  );

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own" on public.items
  for update
  using (
    auth.uid() = user_id
    and (
      space_id is null
      or public.is_space_member(space_id, auth.uid())
    )
    and (expires_at is null or expires_at > now())
  )
  with check (
    auth.uid() = user_id
    and (
      space_id is null
      or public.is_space_member(space_id, auth.uid())
    )
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own" on public.items
  for delete
  using (
    auth.uid() = user_id
    and (
      space_id is null
      or public.is_space_member(space_id, auth.uid())
    )
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "text_select_own" on public.text_items;
create policy "text_select_own" on public.text_items
  for select
  using (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and (
        (
          public.items.space_id is null
          and public.items.user_id = auth.uid()
          and (public.items.expires_at is null or public.items.expires_at > now())
        )
        or (
          public.items.space_id is not null
          and public.items.expires_at > now()
          and public.is_space_member(public.items.space_id, auth.uid())
        )
      )
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
      and (
        public.items.space_id is null
        or public.is_space_member(public.items.space_id, auth.uid())
      )
      and (public.items.expires_at is null or public.items.expires_at > now())
    )
  )
  with check (
    exists (
      select 1 from public.items
      where public.items.id = text_items.item_id
      and public.items.user_id = auth.uid()
      and (
        public.items.space_id is null
        or public.is_space_member(public.items.space_id, auth.uid())
      )
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
      and (
        public.items.space_id is null
        or public.is_space_member(public.items.space_id, auth.uid())
      )
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
      and (
        (
          public.items.space_id is null
          and public.items.user_id = auth.uid()
          and (public.items.expires_at is null or public.items.expires_at > now())
        )
        or (
          public.items.space_id is not null
          and public.items.expires_at > now()
          and public.is_space_member(public.items.space_id, auth.uid())
        )
      )
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
      and (
        public.items.space_id is null
        or public.is_space_member(public.items.space_id, auth.uid())
      )
      and (public.items.expires_at is null or public.items.expires_at > now())
    )
  )
  with check (
    exists (
      select 1 from public.items
      where public.items.id = files.item_id
      and public.items.user_id = auth.uid()
      and (
        public.items.space_id is null
        or public.is_space_member(public.items.space_id, auth.uid())
      )
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
      and (
        public.items.space_id is null
        or public.is_space_member(public.items.space_id, auth.uid())
      )
      and (public.items.expires_at is null or public.items.expires_at > now())
    )
  );
