/**
 * Auth session for Luna Music (ADR 4).
 *
 * Supabase Auth owns sign-up / login and password hashing. The session token is
 * persisted via the SecureStore adapter in lib/supabase.ts.
 */

import type { Session, User } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { fetchProfile } from '@/lib/db/profiles';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

type AuthValue = {
  configured: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalProfile: (patch: Partial<Profile>) => void;
};

const Ctx = createContext<AuthValue | null>(null);

export function useAuth() {
  const v = use(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
    } catch (err) {
      console.warn('Failed to load profile:', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!configured || !supabase) {
      setReady(true);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) void loadProfile(data.session.user.id);
      })
      .catch((err) => console.warn('getSession failed:', err))
      .finally(() => {
        if (mounted) setReady(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) void loadProfile(next.user.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [configured, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!supabase) return { error: 'Supabase is not configured.' };
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: displayName ? { display_name: displayName.trim() } : undefined,
        },
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('signOut failed:', error);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [loadProfile, session?.user]);

  const updateLocalProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((p) => (p ? { ...p, ...patch } : p));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      configured,
      ready,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateLocalProfile,
    }),
    [
      configured,
      ready,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateLocalProfile,
    ],
  );

  return <Ctx value={value}>{children}</Ctx>;
}
