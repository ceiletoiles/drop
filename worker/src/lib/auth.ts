import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types';

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
