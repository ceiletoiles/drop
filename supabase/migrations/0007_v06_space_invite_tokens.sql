alter table public.space_invitations
  add column if not exists invite_token text;

create unique index if not exists space_invitations_invite_token_idx
  on public.space_invitations (invite_token);
