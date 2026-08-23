import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AuthContext, type AuthContextValue } from './auth-context';
import { apiFetch } from '../../lib/http';

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

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let alive = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) {
          setSession(data.session);
          if (!window.sessionStorage.getItem(pendingSignInKey)) {
            lastLoggedSessionRef.current = data.session?.access_token ?? null;
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
    },
    signInWithGoogle: async () => {
      if (!supabase) throw new Error('Supabase is not configured.');
      markPendingSignIn();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    },
    signOut: async () => {
      if (!supabase) throw new Error('Supabase is not configured.');
      if (session?.user?.id) {
        void logActivity({ token: session.access_token, action: 'sign_out' });
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      lastLoggedSessionRef.current = null;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
