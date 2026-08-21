create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('sign_in', 'sign_out', 'create', 'upload', 'edit', 'delete')),
  title text not null,
  item_id uuid references public.items (id) on delete set null,
  item_type text check (item_type in ('text', 'file')),
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_user_created_idx on public.activity_log (user_id, created_at desc);
create index if not exists activity_log_user_action_idx on public.activity_log (user_id, action);

alter table public.activity_log enable row level security;

drop policy if exists "activity_select_own" on public.activity_log;
create policy "activity_select_own" on public.activity_log
  for select
  using (auth.uid() = user_id);

drop policy if exists "activity_insert_own" on public.activity_log;
create policy "activity_insert_own" on public.activity_log
  for insert
  with check (auth.uid() = user_id);
