import { Capacitor } from '@capacitor/core';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getConfiguredAppOrigin = () => trimTrailingSlash((import.meta.env.VITE_APP_ORIGIN ?? '').trim());

const inferAppOriginFromApiBase = () => {
  const configuredApiBase = trimTrailingSlash((import.meta.env.VITE_API_BASE_URL ?? '').trim());
  if (!configuredApiBase) return '';

  try {
    const url = new URL(configuredApiBase.startsWith('http') ? configuredApiBase : `https://${configuredApiBase}`);
    const rewrittenHostname = url.hostname
      .replace(/^api\./i, '')
      .replace(/(^|\.)[a-z0-9-]+-api\./i, (_, prefix: string) => `${prefix}`)
      .replace(/-api(?=\.)/i, '');

    if (rewrittenHostname) {
      return `${url.protocol}//${rewrittenHostname}${url.port ? `:${url.port}` : ''}`.replace(/\/+$/, '');
    }
  } catch {
    return '';
  }

  return '';
};

export const getAppOrigin = () => {
  if (typeof window === 'undefined') return '';
  if (!Capacitor.isNativePlatform()) return window.location.origin;

  const configured = getConfiguredAppOrigin();
  if (configured) return configured;

  const inferred = inferAppOriginFromApiBase();
  return inferred || window.location.origin;
};

export const resolveAppUrl = (pathOrUrl: string) => {
  if (!pathOrUrl) return '';

  try {
    return new URL(pathOrUrl, getAppOrigin()).toString();
  } catch {
    return pathOrUrl;
  }
};

export const getNativeAppSchemeUrl = () => 'com.shiv.drop://auth/callback';

export const getNativeOAuthRedirectUrl = () => {
  return getNativeAppSchemeUrl();
};
