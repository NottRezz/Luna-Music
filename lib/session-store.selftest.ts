/**
 * TEMPORARY — verifies the chunked SecureStore adapter (LM-3) on a real device.
 * Delete this file and its call site once you have seen it pass.
 *
 * This deliberately does NOT go through Supabase auth. It writes and reads its
 * own key, so it proves the chunking works without needing a session, a login,
 * or the schema to be applied.
 *
 * To run: add these two lines to the top of RootLayout in app/_layout.tsx —
 *
 *   import { runSessionStoreSelfTest } from '@/lib/session-store.selftest';
 *   useEffect(() => { void runSessionStoreSelfTest(); }, []);
 *
 * then watch the Metro console.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { ExpoSecureStoreAdapter } from '@/lib/supabase';

const KEY = 'luna.selftest.token';

/** Mixed-width characters, so a naive byte split would tear a surrogate pair. */
function makeSession(approxBytes: number): string {
  const unit = 'aB3_-é中𝄞';
  let out = '';
  while (out.length * 2 < approxBytes) out += unit;
  return JSON.stringify({ access_token: out, note: 'LM-3 self test 🎧' });
}

async function countChunks(): Promise<number> {
  let n = 0;
  for (;;) {
    const part = await SecureStore.getItemAsync(`${KEY}.${n}`);
    if (part === null) return n;
    n++;
  }
}

export async function runSessionStoreSelfTest(): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log('[LM-3] skipped — web uses localStorage, which has no 2 KB cap.');
    return true;
  }

  const log = (ok: boolean, msg: string) =>
    console.log(`[LM-3] ${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  let allOk = true;
  const assert = (ok: boolean, msg: string) => {
    if (!ok) allOk = false;
    log(ok, msg);
  };

  try {
    // Start clean, so a previous run cannot mask a failure.
    await ExpoSecureStoreAdapter.removeItem(KEY);

    // 1. A big value round-trips exactly, and actually took the chunk path.
    const big = makeSession(6000);
    await ExpoSecureStoreAdapter.setItem(KEY, big);

    const chunks = await countChunks();
    assert(chunks > 1, `large value was split (${chunks} chunks)`);

    const manifest = await SecureStore.getItemAsync(KEY);
    assert(
      manifest !== null && manifest.startsWith('__luna_chunks__:'),
      `manifest written (${manifest?.slice(0, 24)}…)`,
    );

    const readBack = await ExpoSecureStoreAdapter.getItem(KEY);
    assert(readBack === big, `large value read back byte-identical (${big.length} chars)`);
    assert(
      readBack !== null && JSON.parse(readBack).note === 'LM-3 self test 🎧',
      'reassembled value still parses as JSON',
    );

    // 2. Shrinking back to a small value must clear the stale chunks, or the
    //    next read would find a leftover manifest pointing at deleted parts.
    const small = JSON.stringify({ access_token: 'short' });
    await ExpoSecureStoreAdapter.setItem(KEY, small);
    assert((await countChunks()) === 0, 'stale chunks cleaned up after shrinking');
    assert((await ExpoSecureStoreAdapter.getItem(KEY)) === small, 'small value round-trips');

    // 3. Growing again, then removing, must leave nothing behind.
    await ExpoSecureStoreAdapter.setItem(KEY, big);
    await ExpoSecureStoreAdapter.removeItem(KEY);
    assert((await SecureStore.getItemAsync(KEY)) === null, 'manifest removed');
    assert((await countChunks()) === 0, 'all chunks removed');
    assert((await ExpoSecureStoreAdapter.getItem(KEY)) === null, 'reads as absent after remove');

    console.log(
      allOk
        ? '[LM-3] ALL PASS — chunked SecureStore adapter is working.'
        : '[LM-3] FAILURES ABOVE — do not delete this file yet.',
    );
    return allOk;
  } catch (err) {
    console.log('[LM-3] FAIL — threw:', err);
    return false;
  } finally {
    await ExpoSecureStoreAdapter.removeItem(KEY).catch(() => {});
  }
}
