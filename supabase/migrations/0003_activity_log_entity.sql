alter table public.activity_log
  add column if not exists entity_kind text check (entity_kind in ('note', 'file', 'image')),
  add column if not exists entity_detail text;
