import { createClient } from '@supabase/supabase-js';
import { appConfig } from './env';

export const supabase = appConfig.supabaseReady
  ? createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;
