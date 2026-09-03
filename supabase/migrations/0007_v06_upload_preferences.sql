create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  upload_default_expiration_type text not null default '24_HOURS' check (upload_default_expiration_type in ('CONSUME', '24_HOURS', '7_DAYS', '1_MONTH')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_preferences_touch_updated_at on public.user_preferences;
create trigger user_preferences_touch_updated_at
before update on public.user_preferences
for each row
execute function public.touch_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own" on public.user_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own" on public.user_preferences
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own" on public.user_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
