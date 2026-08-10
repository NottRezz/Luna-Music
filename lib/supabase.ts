/**
 * Supabase client for Luna Music (ADR 4).
 *
 * Auth sessions are cached on-device with expo-secure-store so the user is not
 * forced to log in every time the app opens. The anon key is safe to ship in
 * the client; Row Level Security enforces per-user access on the server.
 */

import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from '@/types/database';

const EXTRA = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

/**
 * Accepts the real API host (`https://xyz.supabase.co`) or a pasted dashboard
 * settings URL (`…/dashboard/project/xyz/settings/…`) and normalizes to the API host.
 */
export function normalizeSupabaseUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  const fromDashboard = value.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (fromDashboard) return `https://${fromDashboard[1]}.supabase.co`;
  return value.replace(/\/$/, '');
}

export const SUPABASE_URL = normalizeSupabaseUrl(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? EXTRA.supabaseUrl ?? '',
);
/** Accepts legacy anon JWT or the newer `sb_publishable_...` key. */
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  EXTRA.supabaseAnonKey ??
  EXTRA.supabasePublishableKey ??
  '';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * SecureStore rejects keys with characters outside `[A-Za-z0-9._-]`.
 * Web falls back to localStorage because SecureStore is native-only.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      } catch {
        /* ignore quota / private mode */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

function createSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    console.warn(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
    return null;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();

/** Narrow helper for call sites that already checked `isSupabaseConfigured()`. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add your project URL and anon key.');
  }
  return supabase;
}
