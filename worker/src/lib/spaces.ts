import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateSpaceResponse,
  ItemSummary,
  JoinSpaceResponse,
  SpaceDetailResponse,
  SpaceInvitationSummary,
  SpaceMemberSummary,
  SpaceSummary,
  SpacesResponse,
  SpaceExpirationType
} from '../../../shared/types';
import { spaceExpirationTypeSchema, createSpaceSchema, type CreateSpacePayload } from '../../../shared/schemas';
import { DEFAULT_EXPIRATION_TYPE, MAX_UPLOAD_BYTES } from '../../../shared/constants';
import type { Env } from '../types';
import { createText, uploadItem } from './items';
import { deleteFile, getFile } from './storage';

interface SpaceRow {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

interface SpaceMemberRow {
  space_id: string;
  user_id: string;
  display_name: string;
  role: 'owner' | 'member';
  joined_at: string;
}

interface SpaceInvitationRow {
  id: string;
  space_id: string;
  invited_email: string | null;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  token_hash: string;
  invite_token: string | null;
}

interface ItemRow {
  id: string;
  user_id: string;
  space_id: string | null;
  type: 'text' | 'file';
  title: string;
  created_at: string;
  updated_at: string;
  expiration_type: SpaceExpirationType | 'CONSUME';
  expires_at: string | null;
}

interface FileRow {
  item_id: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size: number;
}

interface TextRow {
  item_id: string;
  content: string;
}

const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;

const createDb = (env: Env): SupabaseClient =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
};

const normalizeDisplayName = (value: string | null | undefined) => {
  const normalized = value?.trim();
  if (normalized) return normalized.slice(0, 60);
  return 'Shiv';
};

const bytesToBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const generateToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
};

const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const toSpaceSummary = (row: SpaceRow, memberCount = 0, itemCount = 0): SpaceSummary => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  memberCount,
  itemCount
});

const toMemberSummary = async (db: SupabaseClient, row: SpaceMemberRow): Promise<SpaceMemberSummary> => {
  const { data } = await db.auth.admin.getUserById(row.user_id);
  const metadata = data.user?.user_metadata;
  const profilePicture =
    typeof metadata?.picture === 'string'
      ? metadata.picture
      : typeof metadata?.avatar_url === 'string'
        ? metadata.avatar_url
        : null;

  return {
    userId: row.user_id,
    displayName: row.display_name,
    profilePicture,
    role: row.role,
    joinedAt: row.joined_at
  };
};

const toInvitationSummary = (row: SpaceInvitationRow, token?: string): SpaceInvitationSummary => ({
  id: row.id,
  spaceId: row.space_id,
  invitedEmail: row.invited_email,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  acceptedAt: row.accepted_at,
  token: token ?? row.invite_token ?? undefined,
  url: token ?? row.invite_token ? `/join/${token ?? row.invite_token}` : undefined
});

const isExpired = (row: { expires_at: string | null }, nowIso = new Date().toISOString()) =>
  Boolean(row.expires_at && row.expires_at <= nowIso);

const isMember = async (db: SupabaseClient, spaceId: string, userId: string) => {
  const { data, error } = await db
    .from('space_members')
    .select('space_id,user_id,role,display_name,joined_at')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as SpaceMemberRow | null;
};

const isOwner = async (db: SupabaseClient, spaceId: string, userId: string) => {
  const { data, error } = await db.from('spaces').select('id,owner_id').eq('id', spaceId).maybeSingle();
  if (error) throw error;
  return Boolean(data && data.owner_id === userId);
};

const getSpaceRow = async (db: SupabaseClient, spaceId: string) => {
  const { data, error } = await db
    .from('spaces')
    .select('id,name,owner_id,owner_name,created_at,updated_at')
    .eq('id', spaceId)
    .maybeSingle();

  if (error) throw error;
  return data as SpaceRow | null;
};

const getSpaceItemRows = async (db: SupabaseClient, spaceId: string) => {
  const { data: items, error: itemsError } = await db
    .from('items')
    .select('id,user_id,space_id,type,title,created_at,updated_at,expiration_type,expires_at')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });

  if (itemsError) throw itemsError;

  const itemIds = (items ?? []).filter((item) => !isExpired(item as ItemRow)).map((item) => item.id);
  if (itemIds.length === 0) {
    return { items: [] as ItemRow[], files: [] as FileRow[], textItems: [] as TextRow[] };
  }

  const [{ data: fileRows, error: fileError }, { data: textRows, error: textError }] = await Promise.all([
    db.from('files').select('item_id,storage_key,original_name,mime_type,size').in('item_id', itemIds),
    db.from('text_items').select('item_id,content').in('item_id', itemIds)
  ]);

  if (fileError) throw fileError;
  if (textError) throw textError;

  return {
    items: (items ?? []).filter((item) => !isExpired(item as ItemRow)) as ItemRow[],
    files: (fileRows ?? []) as FileRow[],
    textItems: (textRows ?? []) as TextRow[]
  };
};

const mapSpaceItem = (item: ItemRow, fileRow?: FileRow, textRow?: TextRow, uploadedByName?: string | null): ItemSummary => ({
  id: item.id,
  type: item.type,
  title: item.title,
  expirationType: item.expiration_type as SpaceExpirationType | 'CONSUME',
  expiresAt: item.expires_at,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  spaceId: item.space_id,
  uploadedByUserId: item.user_id,
  uploadedByName,
  file: fileRow
    ? {
        originalName: fileRow.original_name,
        mimeType: fileRow.mime_type,
        size: fileRow.size
      }
    : undefined,
  text: textRow ? { content: textRow.content } : undefined
});

const buildMemberMap = (members: SpaceMemberRow[]) =>
  new Map(
    members.map((member) => [
      member.user_id,
      {
        displayName: member.display_name,
        role: member.role
      }
    ])
  );

const queueFileDeletion = async (
  db: SupabaseClient,
  payload: { storageKey: string; itemId: string; userId: string; reason: 'delete' | 'expired' | 'consume' }
) => {
  const { error } = await db.from('storage_deletion_queue').upsert(
    {
      storage_key: payload.storageKey,
      item_id: payload.itemId,
      user_id: payload.userId,
      reason: payload.reason,
      attempts: 0,
      last_error: null,
      next_attempt_at: new Date().toISOString()
    },
    { onConflict: 'storage_key' }
  );

  if (error) throw error;
};

const tryDeleteQueuedFile = async (env: Env, db: SupabaseClient, row: { id: string; storage_key: string; attempts: number }) => {
  try {
    await deleteFile(env, row.storage_key);
    await db.from('storage_deletion_queue').delete().eq('storage_key', row.storage_key);
  } catch {
    await db
      .from('storage_deletion_queue')
      .update({
        attempts: row.attempts + 1,
        next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      })
      .eq('id', row.id);
  }
};

export const listSpaces = async (env: Env, userId: string): Promise<SpacesResponse> => {
  const db = createDb(env);
  const { data: memberships, error: membershipError } = await db
    .from('space_members')
    .select('space_id,user_id,display_name,role,joined_at')
    .eq('user_id', userId);

  if (membershipError) throw membershipError;

  const spaceIds = (memberships ?? []).map((row) => row.space_id);
  if (spaceIds.length === 0) return { spaces: [] };

  const [{ data: spaceRows, error: spaceError }, { data: memberRows, error: memberError }, { data: itemRows, error: itemError }] =
    await Promise.all([
      db.from('spaces').select('id,name,owner_id,owner_name,created_at,updated_at').in('id', spaceIds),
      db.from('space_members').select('space_id,user_id,display_name,role,joined_at').in('space_id', spaceIds),
      db.from('items').select('id,space_id,expires_at').in('space_id', spaceIds)
    ]);

  if (spaceError) throw spaceError;
  if (memberError) throw memberError;
  if (itemError) throw itemError;

  const memberCounts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCounts.set(row.space_id, (memberCounts.get(row.space_id) ?? 0) + 1);
  }

  const itemCounts = new Map<string, number>();
  for (const row of itemRows ?? []) {
    if (!isExpired(row)) {
      itemCounts.set(row.space_id, (itemCounts.get(row.space_id) ?? 0) + 1);
    }
  }

  const spaces = (spaceRows ?? [])
    .map((row) => toSpaceSummary(row as SpaceRow, memberCounts.get(row.id) ?? 0, itemCounts.get(row.id) ?? 0))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  return { spaces };
};

export const getSpace = async (env: Env, userId: string, spaceId: string): Promise<SpaceDetailResponse> => {
  const db = createDb(env);
  const membership = await isMember(db, spaceId, userId);
  if (!membership) throw new Error('Space not found.');

  const space = await getSpaceRow(db, spaceId);
  if (!space) throw new Error('Space not found.');

  const [{ data: memberRows, error: memberError }, { items, files, textItems }] = await Promise.all([
    db.from('space_members').select('space_id,user_id,display_name,role,joined_at').eq('space_id', spaceId).order('joined_at', { ascending: true }),
    getSpaceItemRows(db, spaceId)
  ]);

  if (memberError) throw memberError;

  const memberMap = buildMemberMap((memberRows ?? []) as SpaceMemberRow[]);
  const itemSummaries = items.map((item) =>
    mapSpaceItem(
      item,
      files.find((row) => row.item_id === item.id),
      textItems.find((row) => row.item_id === item.id),
      memberMap.get(item.user_id)?.displayName ?? null
    )
  );

  const { data: inviteRows, error: inviteError } = await db
    .from('space_invitations')
    .select('id,space_id,invited_email,invited_by,created_at,expires_at,accepted_at,revoked_at,token_hash,invite_token')
    .eq('space_id', spaceId)
    .is('invited_email', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (inviteError) throw inviteError;

  const inviteRow = (inviteRows ?? [])[0] as SpaceInvitationRow | undefined;

  return {
    space: toSpaceSummary(space, (memberRows ?? []).length, itemSummaries.length),
    members: await Promise.all((memberRows ?? []).map((row) => toMemberSummary(db, row as SpaceMemberRow))),
    items: itemSummaries,
    invite: inviteRow ? toInvitationSummary(inviteRow) : null
  };
};

export const createSpace = async (env: Env, payload: CreateSpacePayload, ownerId: string, ownerName: string): Promise<CreateSpaceResponse> => {
  const parsed = createSpaceSchema.parse(payload);
  const db = createDb(env);
  const { data, error } = await db.rpc('create_space', {
    p_owner_id: ownerId,
    p_owner_name: normalizeDisplayName(ownerName),
    p_name: parsed.name
  });

  if (error || !data) throw error ?? new Error('Failed to create space.');
  return { space: toSpaceSummary(data as SpaceRow, 1, 0) };
};

export const renameSpace = async (env: Env, userId: string, spaceId: string, name: string) => {
  const db = createDb(env);
  if (!(await isOwner(db, spaceId, userId))) throw new Error('Unauthorized.');
  const parsed = createSpaceSchema.parse({ name });
  const { data, error } = await db.from('spaces').update({ name: parsed.name }).eq('id', spaceId).eq('owner_id', userId).select('id,name,owner_id,owner_name,created_at,updated_at').single();
  if (error || !data) throw error ?? new Error('Failed to rename space.');
  return { space: toSpaceSummary(data as SpaceRow) };
};

export const deleteSpace = async (env: Env, userId: string, spaceId: string) => {
  const db = createDb(env);
  if (!(await isOwner(db, spaceId, userId))) throw new Error('Unauthorized.');

  const { items, files } = await getSpaceItemRows(db, spaceId);

  for (const file of files) {
    await queueFileDeletion(db, {
      storageKey: file.storage_key,
      itemId: file.item_id,
      userId,
      reason: 'delete'
    });
  }

  const { error: itemDeleteError } = await db.from('items').delete().eq('space_id', spaceId);
  if (itemDeleteError) throw itemDeleteError;

  for (const file of files) {
    const { data: queuedRows, error: queueError } = await db
      .from('storage_deletion_queue')
      .select('id,storage_key,attempts')
      .eq('storage_key', file.storage_key)
      .limit(1);
    if (queueError) throw queueError;
    if (queuedRows?.[0]) {
      await tryDeleteQueuedFile(env, db, queuedRows[0] as { id: string; storage_key: string; attempts: number });
    }
  }

  const { error: spaceDeleteError } = await db.from('spaces').delete().eq('id', spaceId).eq('owner_id', userId);
  if (spaceDeleteError) throw spaceDeleteError;

  return { ok: true as const };
};

export const createSpaceInviteLink = async (env: Env, userId: string, spaceId: string, email?: string | null) => {
  const db = createDb(env);
  if (!(await isOwner(db, spaceId, userId))) throw new Error('Unauthorized.');

  const inviteEmail = email?.trim() || null;
  if (!inviteEmail) {
    const { data: activeLink, error: activeLinkError } = await db
      .from('space_invitations')
      .select('id,space_id,invited_email,invited_by,created_at,expires_at,accepted_at,revoked_at,token_hash,invite_token')
      .eq('space_id', spaceId)
      .is('invited_email', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (activeLinkError) throw activeLinkError;
    if (activeLink) {
      const activeInvite = activeLink as SpaceInvitationRow;
      if (activeInvite.invite_token) {
        return { invitation: toInvitationSummary(activeInvite) };
      }

      const { error: revokeError } = await db
        .from('space_invitations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', activeInvite.id);
      if (revokeError) throw revokeError;
    }
  }

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + inviteTtlMs).toISOString();

  const { data, error } = await db
    .from('space_invitations')
    .insert({
      space_id: spaceId,
      invited_email: inviteEmail,
      invited_by: userId,
      token_hash: tokenHash,
      invite_token: token,
      expires_at: expiresAt
    })
    .select('id,space_id,invited_email,invited_by,created_at,expires_at,accepted_at,revoked_at,token_hash,invite_token')
    .single();

  if (error || !data) throw error ?? new Error('Failed to create invitation.');
  return { invitation: toInvitationSummary(data as SpaceInvitationRow, token) };
};

export const revokeSpaceInviteLink = async (env: Env, userId: string, spaceId: string) => {
  const db = createDb(env);
  if (!(await isOwner(db, spaceId, userId))) throw new Error('Unauthorized.');
  const { error } = await db
    .from('space_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('space_id', spaceId)
    .is('invited_email', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;
  return { ok: true as const };
};

export const validateSpaceInvite = async (env: Env, token: string) => {
  const db = createDb(env);
  const tokenHash = await hashToken(token);
  const { data, error } = await db
    .from('space_invitations')
    .select('id,space_id,invited_email,invited_by,created_at,expires_at,accepted_at,revoked_at,token_hash,invite_token')
    .eq('token_hash', tokenHash)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error || !data) throw new Error('Invitation not found.');
  const invite = data as SpaceInvitationRow;
  if (invite.revoked_at) throw new Error('Invitation revoked.');
  if (isExpired(invite)) throw new Error('Invitation expired.');

  const space = await getSpaceRow(db, invite.space_id);
  if (!space) throw new Error('Space not found.');

  const [{ data: members, error: membersError }, { data: items, error: itemsError }] = await Promise.all([
    db.from('space_members').select('space_id').eq('space_id', invite.space_id),
    db.from('items').select('id,space_id,expires_at').eq('space_id', invite.space_id)
  ]);

  if (membersError) throw membersError;
  if (itemsError) throw itemsError;

  return {
    space: toSpaceSummary(
      space,
      members?.length ?? 0,
      (items ?? []).filter((row) => !isExpired(row)).length
    ),
    invitation: toInvitationSummary(invite)
  };
};

export const joinSpaceInvite = async (env: Env, userId: string, userEmail: string | null, displayName: string, token: string): Promise<JoinSpaceResponse> => {
  const db = createDb(env);
  const tokenHash = await hashToken(token);
  const { data, error } = await db.rpc('join_space_invitation', {
    p_token_hash: tokenHash,
    p_user_id: userId,
    p_user_email: userEmail ?? '',
    p_display_name: normalizeDisplayName(displayName)
  });

  if (error || !data) throw error ?? new Error('Failed to join space.');

  const result = Array.isArray(data) ? (data[0] as { space_id: string; joined: boolean } | undefined) : (data as { space_id: string; joined: boolean });
  if (!result) throw new Error('Failed to join space.');

  const space = await getSpaceRow(db, result.space_id);
  if (!space) throw new Error('Space not found.');

  return {
    space: toSpaceSummary(space),
    joined: Boolean(result.joined)
  };
};

export const listMySpaceInvitations = async (env: Env, userEmail: string | null) => {
  const db = createDb(env);
  const normalizedEmail = userEmail?.trim().toLowerCase();
  if (!normalizedEmail) return { invitations: [] as Array<{ space: { id: string; name: string; ownerName: string }; invitation: SpaceInvitationSummary }> };

  const { data: invitationRows, error: invitationError } = await db
    .from('space_invitations')
    .select('id,space_id,invited_email,invited_by,created_at,expires_at,accepted_at,revoked_at,token_hash,invite_token')
    .eq('invited_email', normalizedEmail)
    .is('revoked_at', null)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (invitationError) throw invitationError;

  const rows = (invitationRows ?? []) as SpaceInvitationRow[];
  if (rows.length === 0) return { invitations: [] as Array<{ space: { id: string; name: string; ownerName: string }; invitation: SpaceInvitationSummary }> };

  const spaceIds = Array.from(new Set(rows.map((row) => row.space_id)));
  const { data: spaceRows, error: spaceError } = await db
    .from('spaces')
    .select('id,name,owner_name')
    .in('id', spaceIds);

  if (spaceError) throw spaceError;

  const spaceMap = new Map((spaceRows ?? []).map((row) => [row.id, { id: row.id, name: row.name, ownerName: row.owner_name }]));

  return {
    invitations: rows
      .map((row) => {
        const space = spaceMap.get(row.space_id);
        if (!space) return null;
        return {
          space,
          invitation: toInvitationSummary(row)
        };
      })
      .filter((value): value is { space: { id: string; name: string; ownerName: string }; invitation: SpaceInvitationSummary } => value !== null)
  };
};

export const removeSpaceMember = async (env: Env, userId: string, spaceId: string, memberUserId: string) => {
  const db = createDb(env);
  if (!(await isOwner(db, spaceId, userId))) throw new Error('Unauthorized.');
  const member = await isMember(db, spaceId, memberUserId);
  if (!member) throw new Error('Member not found.');
  if (member.role === 'owner') throw new Error('Owner cannot be removed.');

  const { error } = await db.from('space_members').delete().eq('space_id', spaceId).eq('user_id', memberUserId);
  if (error) throw error;
  return { ok: true as const };
};

export const leaveSpace = async (env: Env, userId: string, spaceId: string) => {
  const db = createDb(env);
  const member = await isMember(db, spaceId, userId);
  if (!member) throw new Error('Space not found.');
  if (member.role === 'owner') throw new Error('Owner cannot leave until ownership is transferred.');
  const { error } = await db.from('space_members').delete().eq('space_id', spaceId).eq('user_id', userId);
  if (error) throw error;
  return { ok: true as const };
};

export const createSpaceFile = async (
  env: Env,
  userId: string,
  file: File,
  spaceId: string,
  title?: string,
  expirationType?: string
) => {
  const parsedExpiration = spaceExpirationTypeSchema.parse(expirationType ?? DEFAULT_EXPIRATION_TYPE);
  return uploadItem(env, userId, file, title, parsedExpiration, spaceId);
};

export const createSpaceText = async (
  env: Env,
  userId: string,
  payload: { title: string; content: string; expirationType: SpaceExpirationType; spaceId: string }
) => {
  const parsedExpiration = spaceExpirationTypeSchema.parse(payload.expirationType);
  return createText(env, userId, { title: payload.title, content: payload.content, expirationType: parsedExpiration, spaceId: payload.spaceId });
};

export const updateSpaceText = async (
  env: Env,
  userId: string,
  spaceId: string,
  itemId: string,
  payload: { title?: string; content?: string }
) => {
  const db = createDb(env);
  const member = await isMember(db, spaceId, userId);
  if (!member) throw new Error('Space not found.');

  const { data: item, error: itemError } = await db
    .from('items')
    .select('id,user_id,space_id,type,title,created_at,updated_at,expiration_type,expires_at')
    .eq('id', itemId)
    .eq('space_id', spaceId)
    .maybeSingle();

  if (itemError || !item) throw itemError ?? new Error('Not found.');
  const typedItem = item as ItemRow;
  if (typedItem.type !== 'text') throw new Error('Only text items can be edited.');
  if (typedItem.user_id !== userId && member.role !== 'owner') throw new Error('Unauthorized.');

  const updatePayload: Record<string, string> = {};
  if (payload.title?.trim()) updatePayload.title = payload.title.trim();

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await db.from('items').update(updatePayload).eq('id', itemId).eq('space_id', spaceId);
    if (error) throw error;
  }

  if (payload.content !== undefined) {
    const { error } = await db.from('text_items').update({ content: payload.content }).eq('item_id', itemId);
    if (error) throw error;
  }

  const { data: refreshed, error: refreshedError } = await db
    .from('items')
    .select('id,user_id,space_id,type,title,created_at,updated_at,expiration_type,expires_at')
    .eq('id', itemId)
    .eq('space_id', spaceId)
    .single();

  if (refreshedError || !refreshed) throw refreshedError ?? new Error('Not found.');
  const { data: textRow, error: textError } = await db.from('text_items').select('item_id,content').eq('item_id', itemId).single();
  if (textError || !textRow) throw textError ?? new Error('Text missing.');

  return {
    item: mapSpaceItem(refreshed as ItemRow, undefined, textRow as TextRow)
  };
};

export const updateSpaceItemExpiration = async (env: Env, userId: string, spaceId: string, itemId: string, expirationType: SpaceExpirationType) => {
  const db = createDb(env);
  const member = await isMember(db, spaceId, userId);
  if (!member) throw new Error('Space not found.');
  const { data: item, error: itemError } = await db
    .from('items')
    .select('id,user_id,space_id,type,title,created_at,updated_at,expiration_type,expires_at')
    .eq('id', itemId)
    .eq('space_id', spaceId)
    .maybeSingle();

  if (itemError || !item) throw itemError ?? new Error('Not found.');
  if ((item as ItemRow).user_id !== userId && member.role !== 'owner') throw new Error('Unauthorized.');

  const { error: updateError } = await db
    .from('items')
    .update({ expiration_type: expirationType })
    .eq('id', itemId)
    .eq('space_id', spaceId);

  if (updateError) throw updateError;

  const { data: refreshed, error: refreshedError } = await db
    .from('items')
    .select('id,user_id,space_id,type,title,created_at,updated_at,expiration_type,expires_at')
    .eq('id', itemId)
    .eq('space_id', spaceId)
    .single();

  if (refreshedError || !refreshed) throw refreshedError ?? new Error('Not found.');
  return { item: mapSpaceItem(refreshed as ItemRow) };
};

export const deleteSpaceItem = async (env: Env, userId: string, spaceId: string, itemId: string) => {
  const db = createDb(env);
  const member = await isMember(db, spaceId, userId);
  if (!member) throw new Error('Space not found.');

  const { data: item, error: itemError } = await db
    .from('items')
    .select('id,user_id,space_id,type,title,created_at,updated_at,expiration_type,expires_at')
    .eq('id', itemId)
    .eq('space_id', spaceId)
    .maybeSingle();

  if (itemError || !item) throw itemError ?? new Error('Not found.');
  const typedItem = item as ItemRow;
  if (typedItem.user_id !== userId && member.role !== 'owner') throw new Error('Unauthorized.');

  let fileRow: FileRow | null = null;
  if (typedItem.type === 'file') {
    const { data, error } = await db.from('files').select('item_id,storage_key,original_name,mime_type,size').eq('item_id', itemId).maybeSingle();
    if (error) throw error;
    fileRow = data as FileRow | null;
  }

  if (fileRow) {
    await queueFileDeletion(db, {
      storageKey: fileRow.storage_key,
      itemId: typedItem.id,
      userId,
      reason: 'delete'
    });
  }

  const { error: deleteError } = await db.from('items').delete().eq('id', itemId).eq('space_id', spaceId);
  if (deleteError) throw deleteError;

  if (fileRow) {
    const { data: queuedRows, error: queueError } = await db
      .from('storage_deletion_queue')
      .select('id,storage_key,attempts')
      .eq('storage_key', fileRow.storage_key)
      .limit(1);

    if (queueError) throw queueError;
    if (queuedRows?.[0]) {
      await tryDeleteQueuedFile(env, db, queuedRows[0] as { id: string; storage_key: string; attempts: number });
    }
  }

  return { ok: true as const };
};

export const downloadSpaceItemFile = async (env: Env, userId: string, spaceId: string, itemId: string) => {
  const db = createDb(env);
  if (!(await isMember(db, spaceId, userId))) throw new Error('Space not found.');

  const { data: item, error: itemError } = await db
    .from('items')
    .select('id,user_id,space_id,type,title,created_at,updated_at,expiration_type,expires_at')
    .eq('id', itemId)
    .eq('space_id', spaceId)
    .maybeSingle();

  if (itemError || !item) throw itemError ?? new Error('Not found.');
  if ((item as ItemRow).type !== 'file') throw new Error('Not found.');

  const { data: fileRow, error: fileError } = await db.from('files').select('item_id,storage_key,original_name,mime_type,size').eq('item_id', itemId).maybeSingle();
  if (fileError || !fileRow) throw fileError ?? new Error('File missing.');

  const object = await getFile(env, fileRow.storage_key);
  if (!object) throw new Error('File missing from storage.');

  return { object, fileRow: fileRow as FileRow };
};

export const copySpaceItemText = async (env: Env, userId: string, spaceId: string, itemId: string) => {
  const db = createDb(env);
  if (!(await isMember(db, spaceId, userId))) throw new Error('Space not found.');

  const { data: item, error: itemError } = await db
    .from('items')
    .select('id,user_id,space_id,type,title,created_at,updated_at,expiration_type,expires_at')
    .eq('id', itemId)
    .eq('space_id', spaceId)
    .maybeSingle();

  if (itemError || !item) throw itemError ?? new Error('Not found.');
  if ((item as ItemRow).type !== 'text') throw new Error('Not found.');

  const { data: textRow, error: textError } = await db.from('text_items').select('item_id,content').eq('item_id', itemId).maybeSingle();
  if (textError || !textRow) throw textError ?? new Error('Text missing.');

  return {
    item: mapSpaceItem(item as ItemRow, undefined, textRow as TextRow)
  };
};
