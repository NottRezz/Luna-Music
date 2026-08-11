import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddToPlaylist } from '@/components/add-to-playlist';
import { Grad } from '@/components/aero/primitives';
import { Dock } from '@/components/player/dock';
import { NowPlaying } from '@/components/player/now-playing';
import { PlaylistManager } from '@/components/playlist-manager';
import { G } from '@/constants/aero';
// TEMP (LM-3) — remove with lib/session-store.selftest.ts once verified.
import { runSessionStoreSelfTest } from '@/lib/session-store.selftest';
import { AuthProvider, useAuth } from '@/providers/auth';
import { LibraryProvider } from '@/providers/library';
import { PlayerProvider } from '@/providers/player';
import { UIProvider } from '@/providers/ui';

export const unstable_settings = {
  // Auth is the first surface; tabs open after a session exists (ADR 2).
  anchor: '(auth)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Nunito carries the whole typographic identity — every weight from 500 to
  // 900 is used somewhere, so hold the splash until they are all in.
  const [loaded] = useFonts({
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  // TEMP (LM-3) — runs before the auth gate, so it needs no session.
  useEffect(() => {
    void runSessionStoreSelfTest();
  }, []);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LibraryProvider>
            <PlayerProvider>
              <UIProvider>
                <Grad g={G.app} style={{ flex: 1 }}>
                  <AuthGate />
                </Grad>
              </UIProvider>
            </PlayerProvider>
          </LibraryProvider>
        </AuthProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Stack + session redirect. Login/Register sit in `(auth)`; the bottom-tab
 * group only opens once Supabase has a session (ADR 2 + ADR 4).
 */
function AuthGate() {
  const { ready, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [ready, session, segments, router]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {session ? (
        <>
          {/* These live outside the navigator so playback state and the
              mini-player survive tab changes, and so the sheets can dim
              and cover the whole shell — dock included — the way
              `.sheet { inset: 0; z-index: 10 }` does. */}
          <Dock />
          <NowPlaying />
          <AddToPlaylist />
          <PlaylistManager />
        </>
      ) : null}
    </View>
  );
}
