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

/* ============================================================
   SecureStore session storage

   SecureStore caps a single value at 2048 bytes and a Supabase session is
   comfortably past that — an access JWT, a refresh token, and the whole
   serialised user object. Today the SDK only warns and the write may or may
   not land; it says a future version will throw. Either way the symptom is a
   user who is silently signed out on relaunch, so the value is split across
   numbered keys and reassembled on read.
   ============================================================ */

/** Well under SecureStore's 2048, leaving headroom for the platform's own framing. */
const CHUNK_BYTES = 1800;
/** Written in place of the value when it was split. Not valid JSON, so it can
 *  never be confused with a real session written by an older build. */
const CHUNK_MARK = '__luna_chunks__:';
/** SecureStore keys allow `[A-Za-z0-9._-]`, so `.` is a safe separator. */
const chunkKey = (key: string, i: number) => `${key}.${i}`;

/**
 * UTF-8 byte length, computed here rather than with `TextEncoder` — which is
 * not guaranteed present across every RN engine this has to run on.
 */
function utf8Length(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      // Surrogate pair: four bytes, and the low half must not be split off.
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

/** Split on byte budget without ever cutting a surrogate pair in half. */
function splitByBytes(value: string, budget: number): string[] {
  const parts: string[] = [];
  let start = 0;
  let bytes = 0;

  for (let i = 0; i < value.length; ) {
    const code = value.charCodeAt(i);
    const isPair = code >= 0xd800 && code <= 0xdbff && i + 1 < value.length;
    const width = isPair ? 2 : 1;
    const cost = code < 0x80 ? 1 : code < 0x800 ? 2 : isPair ? 4 : 3;

    if (bytes + cost > budget && i > start) {
      parts.push(value.slice(start, i));
      start = i;
      bytes = 0;
    }

    bytes += cost;
    i += width;
  }

  if (start < value.length) parts.push(value.slice(start));
  return parts;
}

/** Delete chunk keys from `from` upwards until one is already absent. */
async function deleteChunksFrom(key: string, from: number) {
  for (let i = from; ; i++) {
    const existing = await SecureStore.getItemAsync(chunkKey(key, i));
    if (existing === null) return;
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
}

const webStorage = {
  getItem: (key: string) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      /* ignore quota / private mode */
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Web falls back to localStorage, which is native-only-free and uncapped.
 *
 * Exported so the chunking can be exercised directly, without standing up a
 * session — see lib/session-store.selftest.ts.
 */
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return webStorage.getItem(key);

    const head = await SecureStore.getItemAsync(key);
    if (head === null || !head.startsWith(CHUNK_MARK)) return head;

    const count = Number(head.slice(CHUNK_MARK.length));
    if (!Number.isInteger(count) || count < 1) return null;

    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      // A torn write fails closed: no session, so the user signs in again.
      // Returning a truncated string would hand Supabase unparseable JSON.
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      webStorage.setItem(key, value);
      return;
    }

    if (utf8Length(value) <= CHUNK_BYTES) {
      await SecureStore.setItemAsync(key, value);
      // A previous, longer session may have left chunks behind.
      await deleteChunksFrom(key, 0);
      return;
    }

    const parts = splitByBytes(value, CHUNK_BYTES);
    for (let i = 0; i < parts.length; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), parts[i]);
    }
    // Manifest last, so a crash mid-write leaves the old value readable rather
    // than a pointer into half-written chunks.
    await SecureStore.setItemAsync(key, `${CHUNK_MARK}${parts.length}`);
    await deleteChunksFrom(key, parts.length);
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      webStorage.removeItem(key);
      return;
    }

    const head = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key);
    if (head !== null && head.startsWith(CHUNK_MARK)) await deleteChunksFrom(key, 0);
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
