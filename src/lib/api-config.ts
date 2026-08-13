const STORAGE_KEY = 'drop-api-base-url';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const isBrowser = typeof window !== 'undefined';

const isLocalhostUrl = (value: string) => /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(value);

export const getStoredApiBaseUrl = () => {
  if (!isBrowser) return '';
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
};

export const setStoredApiBaseUrl = (value: string) => {
  if (!isBrowser) return;
  window.localStorage.setItem(STORAGE_KEY, trimTrailingSlash(value.trim()));
};

export const clearStoredApiBaseUrl = () => {
  if (!isBrowser) return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getConfiguredApiBaseUrl = () => {
  const stored = getStoredApiBaseUrl();
  if (stored) return stored;
  return trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? '');
};

export const needsApiOverride = () => {
  if (!isBrowser) return false;
  const configured = getConfiguredApiBaseUrl();
  const onLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  return !onLocalhost && (!configured || isLocalhostUrl(configured));
};
