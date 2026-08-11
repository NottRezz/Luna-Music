/**
 * Renders whatever `useToast().notify()` has to say.
 *
 * There is no toast in design/mockup/, so this is composed from pieces the
 * mockup does define — the frosted `.card` fill, its hairline and shadow — in
 * the red the auth screens already use for a form error.
 *
 * It sits at the BOTTOM, above the dock. The first version put it under the tab
 * strip, which on the Search screen landed squarely over the search field — so
 * "Search failed, try again" covered the control you would try again with.
 * Nothing sits at the bottom except the dock, and the dock's own height is
 * known.
 *
 * Tapping it dismisses. It also dismisses itself; see DISMISS_MS.
 */

import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/aero/icon';
import { Press } from '@/components/aero/primitives';
import { C, F, H, R, SH, s } from '@/constants/aero';
import { usePlayer } from '@/providers/player';
import { useToast } from '@/providers/toast';
import { useUI } from '@/providers/ui';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const { track } = usePlayer();
  const { nowPlayingOpen } = useUI();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  // Mirrors the Dock's own visibility test exactly — see components/player/dock.tsx.
  // If they ever disagree the toast either floats or hides behind the dock.
  const dockVisible = !!track && !nowPlayingOpen;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: (dockVisible ? H.dock : 0) + insets.bottom + s(10),
        left: s(12),
        right: s(12),
        gap: s(6),
      }}>
      {toasts.map((t) => (
        <Animated.View
          key={t.id}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(140)}
          layout={LinearTransition.duration(160)}>
          <Press onPress={() => dismiss(t.id)} scale={0.99}>
            <View
              accessibilityRole="alert"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: s(9),
                paddingVertical: s(10),
                paddingHorizontal: s(12),
                borderRadius: R.md,
                backgroundColor: t.tone === 'error' ? '#fff1ef' : '#fff',
                borderWidth: 1,
                borderColor: t.tone === 'error' ? 'rgba(180,35,24,.28)' : C.hairline,
                ...SH.card,
              }}>
              <Icon
                name={t.tone === 'error' ? 'bell' : 'check'}
                size={s(15)}
                color={t.tone === 'error' ? '#b42318' : C.lunaBlue}
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: F.bold,
                  fontSize: s(11),
                  lineHeight: s(15.5),
                  color: t.tone === 'error' ? '#8a1c12' : C.ink,
                }}>
                {t.message}
              </Text>
            </View>
          </Press>
        </Animated.View>
      ))}
    </View>
  );
}
