import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
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
import { LibraryProvider } from '@/providers/library';
import { PlayerProvider } from '@/providers/player';
import { UIProvider } from '@/providers/ui';

export const unstable_settings = {
  anchor: '(tabs)',
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

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LibraryProvider>
          <PlayerProvider>
            <UIProvider>
              <Grad g={G.app} style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
                    <Stack.Screen name="(tabs)" />
                  </Stack>
                </View>

                {/* These live outside the navigator so playback state and the
                    mini-player survive tab changes, and so the sheets can dim
                    and cover the whole shell — dock included — the way
                    `.sheet { inset: 0; z-index: 10 }` does. */}
                <Dock />
                <NowPlaying />
                <AddToPlaylist />
                <PlaylistManager />
              </Grad>
            </UIProvider>
          </PlayerProvider>
        </LibraryProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
