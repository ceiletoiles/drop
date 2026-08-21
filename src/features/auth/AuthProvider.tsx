import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AuthContext, type AuthContextValue } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastLoggedSessionRef = useRef<string | null>(null);

  const logActivity = (payload: { userId: string; action: 'sign_in' | 'sign_out'; title: string }) => {
    if (!supabase) return;

    void supabase
      .from('activity_log')
      .insert({
        user_id: payload.userId,
        action: payload.action,
        title: payload.title
      })
      .catch(() => undefined);
  };

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
          lastLoggedSessionRef.current = data.session?.access_token ?? null;
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_IN' && nextSession?.access_token && lastLoggedSessionRef.current !== nextSession.access_token) {
        lastLoggedSessionRef.current = nextSession.access_token;
        logActivity({ userId: nextSession.user.id, action: 'sign_in', title: 'Signed in' });
      }
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    configured: Boolean(supabase),
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
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
        logActivity({ userId: session.user.id, action: 'sign_out', title: 'Signed out' });
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      lastLoggedSessionRef.current = null;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
