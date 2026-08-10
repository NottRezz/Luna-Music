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
  /** Rotate the signed-in account's password. See `changePassword` below. */
  changePassword: (current: string, next: string) => Promise<{ error: string | null }>;
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

  /**
   * Rotate the password. Until this existed there was no way to replace a
   * credential you thought was compromised — the Profile field was
   * `editable={false}` and there is still no reset-by-email flow (LM-27).
   *
   * Supabase's `updateUser` does NOT ask for the current password: possession
   * of a valid session is enough. That means an unlocked phone is enough to
   * lock the owner out of their own account, so the current password is
   * verified first by re-signing in with it. That call also fails closed if the
   * account has been disabled server-side since this session was minted.
   *
   * `signInWithPassword` replaces the session on success, which is harmless
   * here — it is the same user, and `onAuthStateChange` keeps state in step.
   */
  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!supabase) return { error: 'Supabase is not configured.' };
      const email = session?.user?.email;
      if (!email) return { error: 'No signed-in account.' };
      if (next.length < 6) return { error: 'New password must be at least 6 characters.' };
      if (next === current) return { error: 'That is already your password.' };

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (verifyError) return { error: 'Current password is incorrect.' };

      const { error } = await supabase.auth.updateUser({ password: next });
      return { error: error?.message ?? null };
    },
    [session?.user?.email],
  );

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
      changePassword,
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
      changePassword,
      refreshProfile,
      updateLocalProfile,
    ],
  );

  return <Ctx value={value}>{children}</Ctx>;
}
