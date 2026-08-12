export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  supabaseReady: boolean;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const appConfig: AppConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? ''),
  supabaseReady: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
};

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return appConfig.apiBaseUrl ? `${appConfig.apiBaseUrl}${normalizedPath}` : normalizedPath;
};
