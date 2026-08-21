import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ActivityAction, ActivitySummary } from '../../../shared/types';
import type { Env } from '../types';

interface ActivityRow {
  id: string;
  user_id: string;
  action: ActivityAction;
  title: string;
  item_id: string | null;
  item_type: 'text' | 'file' | null;
  entity_kind: 'note' | 'file' | 'image' | null;
  entity_detail: string | null;
  size_bytes: number | string | null;
  created_at: string;
}

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

export const listActivities = async (env: Env, userId: string, limit = 20): Promise<ActivitySummary[]> => {
  const db = createDb(env);
  const cappedLimit = Math.max(1, Math.min(limit, 20));

  const { data, error } = await db
    .from('activity_log')
    .select('id,user_id,action,title,item_id,item_type,entity_kind,entity_detail,size_bytes,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(cappedLimit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const activity = row as ActivityRow;
    return {
      id: activity.id,
      action: activity.action,
      title: activity.title,
      createdAt: activity.created_at,
      itemId: activity.item_id,
      itemType: activity.item_type,
      entityKind: activity.entity_kind,
      entityDetail: activity.entity_detail,
      sizeBytes: toNumber(activity.size_bytes)
    };
  });
};

export const recordActivity = async (
  env: Env,
  payload: {
    userId: string;
    action: ActivityAction;
    title: string;
    itemId?: string | null;
    itemType?: 'text' | 'file' | null;
    entityKind?: 'note' | 'file' | 'image' | null;
    entityDetail?: string | null;
    sizeBytes?: number | null;
  }
) => {
  const db = createDb(env);
  const { error } = await db.from('activity_log').insert({
    user_id: payload.userId,
    action: payload.action,
    title: payload.title,
    item_id: payload.itemId ?? null,
    item_type: payload.itemType ?? null,
    entity_kind: payload.entityKind ?? null,
    entity_detail: payload.entityDetail ?? null,
    size_bytes: payload.sizeBytes ?? null
  });

  if (error) throw error;
};
