import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expirationTypeSchema } from '../../../shared/schemas';
import { DEFAULT_EXPIRATION_TYPE } from '../../../shared/constants';
import type { ExpirationType } from '../../../shared/types';
import type { Env } from '../types';

interface UserPreferenceRow {
  user_id: string;
  upload_default_expiration_type: ExpirationType;
  created_at: string;
  updated_at: string;
}

interface UploadDefaultExpirationPreference {
  uploadDefaultExpirationType: ExpirationType;
}

const createDb = (env: Env): SupabaseClient =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

export const getUploadDefaultExpirationType = async (env: Env, userId: string): Promise<UploadDefaultExpirationPreference> => {
  const db = createDb(env);
  const { data, error } = await db
    .from('user_preferences')
    .select('upload_default_expiration_type')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return {
    uploadDefaultExpirationType: (data as Pick<UserPreferenceRow, 'upload_default_expiration_type'> | null)?.upload_default_expiration_type ?? DEFAULT_EXPIRATION_TYPE
  };
};

export const setUploadDefaultExpirationType = async (
  env: Env,
  userId: string,
  expirationType: string
): Promise<UploadDefaultExpirationPreference> => {
  const parsed = expirationTypeSchema.parse(expirationType);
  const db = createDb(env);

  const { error } = await db.from('user_preferences').upsert(
    {
      user_id: userId,
      upload_default_expiration_type: parsed
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;

  return {
    uploadDefaultExpirationType: parsed
  };
};
