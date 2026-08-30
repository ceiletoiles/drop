import { getConfiguredApiBaseUrl } from './api-config';

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  googleWebClientId: string;
  supabaseReady: boolean;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const appConfig: AppConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  apiBaseUrl: trimTrailingSlash(getConfiguredApiBaseUrl()),
  googleWebClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? '',
  supabaseReady: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
};

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiBaseUrl = trimTrailingSlash(getConfiguredApiBaseUrl());
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
};
