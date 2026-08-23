create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  token text unique,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  download_count integer not null default 0 check (download_count >= 0)
);

create index if not exists shares_item_idx on public.shares (item_id);
create index if not exists shares_created_idx on public.shares (created_at desc);
create unique index if not exists shares_active_item_idx on public.shares (item_id) where revoked_at is null;

alter table public.shares enable row level security;

create or replace function public.create_share_link(p_item_id uuid, p_token text, p_token_hash text)
returns public.shares
language plpgsql
as $$
declare
  share_row public.shares;
begin
  update public.shares
    set revoked_at = now()
    where item_id = p_item_id
      and revoked_at is null;

  insert into public.shares (item_id, token, token_hash)
  values (p_item_id, p_token, p_token_hash)
  returning * into share_row;

  return share_row;
end;
$$;
