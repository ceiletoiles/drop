import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../../lib/supabase';
import { AuthContext, type AuthContextValue } from './auth-context';
import { apiFetch } from '../../lib/http';
import { getNativeOAuthRedirectUrl } from '../../lib/app-url';
import { appConfig } from '../../lib/env';
import { NativeGoogleAuth } from '../../lib/native-google-auth';
import { createAuthNonce, hashAuthNonce } from '../../lib/nonce';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastLoggedSessionRef = useRef<string | null>(null);
  const pendingSignInKey = 'drop.pending_sign_in';

  const markPendingSignIn = () => {
    window.sessionStorage.setItem(pendingSignInKey, String(Date.now()));
  };

  const consumePendingSignIn = () => {
    const pending = window.sessionStorage.getItem(pendingSignInKey);
    if (!pending) return false;
    window.sessionStorage.removeItem(pendingSignInKey);
    return true;
  };

  const logActivity = useCallback(
    async (payload: { token: string; action: 'sign_in' | 'sign_out'; retries?: number }) => {
      const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

      const attempt = async (retries: number): Promise<void> => {
        try {
          await apiFetch('/api/activity', {
            method: 'POST',
            token: payload.token,
            body: JSON.stringify({ action: payload.action })
          });
        } catch {
          if (retries <= 0) {
            return;
          }

          await sleep(400);
          await attempt(retries - 1);
        }
      };

      await attempt(payload.retries ?? 0);
    },
    []
  );

  const handleOAuthRedirect = useCallback(async (url: string) => {
    const client = supabase;
    if (!client) return;

    try {
      const parsedUrl = new URL(url);
      const fragmentParams = parsedUrl.hash.startsWith('#') ? new URLSearchParams(parsedUrl.hash.slice(1)) : null;
      const code = parsedUrl.searchParams.get('code') ?? fragmentParams?.get('code');
      const accessToken = parsedUrl.searchParams.get('access_token') ?? fragmentParams?.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token') ?? fragmentParams?.get('refresh_token');

      if (!code && !(accessToken && refreshToken)) return;

      if (code) {
        const flowId = parsedUrl.searchParams.get('sb_flow_id') ?? fragmentParams?.get('sb_flow_id') ?? undefined;
        const { data, error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
        if (error) throw error;
        setSession(data.session);
      } else if (accessToken && refreshToken) {
        const { data, error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) throw error;
        setSession(data.session);
      }
    } finally {
      if (Capacitor.isNativePlatform()) {
        void Browser.close().catch(() => undefined);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let alive = true;

    const initialize = async () => {
      if (Capacitor.isNativePlatform()) {
        const launch = await App.getLaunchUrl();
        const launchUrl = launch?.url ?? null;
        if (launchUrl) {
          await handleOAuthRedirect(launchUrl);
        }
      }

      const { data } = await client.auth.getSession();
      if (!alive) return;

      setSession(data.session);
      if (!window.sessionStorage.getItem(pendingSignInKey)) {
        lastLoggedSessionRef.current = data.session?.access_token ?? null;
      }
      setLoading(false);
    };

    void initialize().catch(() => {
      if (alive) setLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setLoading(false);
    });

    const nativeUrlListenerPromise = Capacitor.isNativePlatform()
      ? App.addListener('appUrlOpen', ({ url }) => {
          if (!url) return;
          void handleOAuthRedirect(url);
        })
      : Promise.resolve(null);

    return () => {
      alive = false;
      data.subscription.unsubscribe();
      void nativeUrlListenerPromise.then((listener) => listener?.remove());
    };
  }, [handleOAuthRedirect]);

  useEffect(() => {
    if (!session?.access_token || !session.user?.id) return;
    if (!consumePendingSignIn()) return;
    if (lastLoggedSessionRef.current === session.access_token) return;

    lastLoggedSessionRef.current = session.access_token;
    void logActivity({ token: session.access_token, action: 'sign_in', retries: 2 });
  }, [session?.access_token, session?.user?.id, logActivity]);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    configured: Boolean(supabase),
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      markPendingSignIn();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      void data.session;
    },
    signUp: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: Capacitor.isNativePlatform() ? getNativeOAuthRedirectUrl() : window.location.origin
        }
      });
      if (error) throw error;
    },
    signInWithGoogle: async () => {
      if (!supabase) throw new Error('Supabase is not configured.');
      markPendingSignIn();
      if (Capacitor.isNativePlatform()) {
        try {
          const serverClientId = appConfig.googleWebClientId.trim();
          if (!serverClientId) {
            throw new Error('Google web client ID is not configured.');
          }

          const nonce = createAuthNonce();
          const hashedNonce = await hashAuthNonce(nonce);
          const { idToken } = await NativeGoogleAuth.signIn({
            serverClientId,
            nonce: hashedNonce
          });

          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
            nonce
          });

          if (error) throw error;
          setSession(data.session);
          return;
        } catch (error) {
          window.sessionStorage.removeItem(pendingSignInKey);
          throw error;
        }
      }

      const options = {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account'
        }
      };

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options
      });
      if (error) throw error;
    },
    signOut: async () => {
      if (!supabase) throw new Error('Supabase is not configured.');
      if (session?.user?.id) {
        void logActivity({ token: session.access_token, action: 'sign_out' });
      }
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setSession(null);
      lastLoggedSessionRef.current = null;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
