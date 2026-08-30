import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { getNativeAppSchemeUrl } from '../lib/app-url';

export const AuthCallbackPage = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      return;
    }

    const url = new URL(window.location.href);
    const fragmentParams = url.hash.startsWith('#') ? new URLSearchParams(url.hash.slice(1)) : null;
    const hasOAuthPayload =
      url.searchParams.has('code') ||
      url.searchParams.has('access_token') ||
      Boolean(fragmentParams?.has('code') || fragmentParams?.has('access_token'));

    if (!hasOAuthPayload) {
      return;
    }

    const target = `${getNativeAppSchemeUrl()}${url.search}${url.hash}`;
    window.location.replace(target);
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center text-sm text-slate-600">
      Finishing sign-in...
    </div>
  );
};
