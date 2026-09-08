import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types';
import { deleteFile } from './storage';

const createAdminClient = (env: Env): SupabaseClient =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  displayName: string;
}

export const getAuthenticatedUser = async (request: Request, env: Env): Promise<AuthenticatedUser | null> => {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length);
  const client = createAdminClient(env);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    displayName:
      (typeof data.user.user_metadata?.full_name === 'string' && data.user.user_metadata.full_name.trim()) ||
      (typeof data.user.user_metadata?.name === 'string' && data.user.user_metadata.name.trim()) ||
      data.user.email?.split('@')[0] ||
      'Shiv'
  };
};

const chunks = <T>(values: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
};

export const deleteAccount = async (env: Env, userId: string) => {
  const db = createAdminClient(env);

  const [{ data: userItems, error: userItemsError }, { data: ownedSpaces, error: ownedSpacesError }] = await Promise.all([
    db.from('items').select('id').eq('user_id', userId),
    db.from('spaces').select('id').eq('owner_id', userId)
  ]);
  if (userItemsError) throw userItemsError;
  if (ownedSpacesError) throw ownedSpacesError;

  const ownedSpaceIds = (ownedSpaces ?? []).map((row) => String((row as { id: string }).id));
  let ownedSpaceItems: Array<{ id: string }> = [];
  if (ownedSpaceIds.length > 0) {
    const { data, error } = await db.from('items').select('id').in('space_id', ownedSpaceIds);
    if (error) throw error;
    ownedSpaceItems = (data ?? []) as Array<{ id: string }>;
  }

  const itemIds = Array.from(
    new Set([
      ...(userItems ?? []).map((row) => String((row as { id: string }).id)),
      ...ownedSpaceItems.map((row) => String(row.id))
    ])
  );

  if (itemIds.length > 0) {
    const { data: files, error: filesError } = await db.from('files').select('storage_key').in('item_id', itemIds);
    if (filesError) throw filesError;

    await Promise.all(
      ((files ?? []) as Array<{ storage_key: string }>).map((file) => deleteFile(env, file.storage_key))
    );

    const { error: queueError } = await db.from('storage_deletion_queue').delete().in('item_id', itemIds);
    if (queueError) throw queueError;

    for (const itemChunk of chunks(itemIds, 100)) {
      const { error } = await db.from('items').delete().in('id', itemChunk);
      if (error) throw error;
    }
  }

  for (const spaceChunk of chunks(ownedSpaceIds, 100)) {
    const { error } = await db.from('spaces').delete().in('id', spaceChunk).eq('owner_id', userId);
    if (error) throw error;
  }

  const { error: deleteUserError } = await db.auth.admin.deleteUser(userId);
  if (deleteUserError) throw deleteUserError;

  return { ok: true as const };
};
