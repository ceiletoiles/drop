create or replace function public.extend_item_expiration(
  p_item_id uuid,
  p_user_id uuid,
  p_expiration_type text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  next_expires_at timestamptz;
begin
  update public.items
  set expires_at = expires_at + case p_expiration_type
    when '24_HOURS' then interval '24 hours'
    when '7_DAYS' then interval '7 days'
    when '1_MONTH' then interval '1 month'
    else null
  end
  where id = p_item_id
    and user_id = p_user_id
    and space_id is null
    and expiration_type <> 'CONSUME'
    and expires_at is not null
    and p_expiration_type in ('24_HOURS', '7_DAYS', '1_MONTH')
  returning expires_at into next_expires_at;

  if next_expires_at is null then
    raise exception 'Item expiration could not be extended.';
  end if;

  return next_expires_at;
end;
$$;