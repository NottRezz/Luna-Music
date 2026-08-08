/**
 * `.appbar` + `.tabs` — the fixed chrome at the top of every screen.
 *
 * Rendered as the tab navigator's `tabBar` so the bar and the strip stay one
 * unit: the selected tab grows 30px -> 34px and its gradient bottoms out on the
 * same colour as the content pane, which is what makes it read as merging into
 * the page rather than sitting on top of it.
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Grad, IconBtn } from '@/components/aero/primitives';
import { C, F, G, H, R, SH, s, textShadow } from '@/constants/aero';

const TAB_LABELS: Record<string, string> = {
  index: 'Search',
  playlist: 'Playlist',
  library: 'Library',
  profile: 'Profile',
};

export function AeroChrome({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ zIndex: 3 }}>
      {/* App bar */}
      <Grad
        g={G.appbar}
        style={{
          height: H.appbar + insets.top,
          paddingTop: insets.top,
          paddingHorizontal: s(12),
          flexDirection: 'row',
          alignItems: 'center',
          gap: s(10),
          overflow: 'hidden',
          ...SH.appbar,
        }}>
        {/* `.appbar::after` — gloss over the top 48% */}
        <Grad g={G.glossBar} pointerEvents="none" style={[StyleSheet.absoluteFillObject, { bottom: '52%' }]} />
        <Fizz />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8), flex: 1 }}>
          <Grad
            g={G.brandOrb}
            style={{
              width: s(24),
              height: s(24),
              borderRadius: s(8),
              alignItems: 'center',
              justifyContent: 'center',
              ...SH.btn,
            }}>
            <Text style={{ color: '#fff', fontSize: s(13), lineHeight: s(16) }}>♪</Text>
          </Grad>

          <View style={{ minWidth: 0 }}>
            <Text style={{ fontFamily: F.black, fontSize: s(13.5), color: '#fff', ...textShadow(0.45, 2) }}>
              Luna Music
            </Text>
            <Text
              style={{
                fontFamily: F.extrabold,
                fontSize: s(8.5),
                letterSpacing: s(8.5) * 0.16,
                color: 'rgba(255,255,255,.72)',
              }}>
              ONLINE
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: s(6) }}>
          <IconBtn name="bell" />
          <IconBtn name="person" onPress={() => navigation.navigate('profile')} />
        </View>
      </Grad>

      {/* Tab strip */}
      <Grad
        g={G.tabsBar}
        style={{
          height: H.tabs,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: s(3),
          paddingHorizontal: s(8),
        }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = TAB_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const shape = {
            height: focused ? s(34) : s(30),
            borderTopLeftRadius: s(9),
            borderTopRightRadius: s(9),
            alignItems: 'center',
            justifyContent: 'center',
          } as const;

          const text = {
            fontFamily: F.black,
            fontSize: s(9.5),
            letterSpacing: s(9.5) * 0.05,
            textTransform: 'uppercase',
            color: focused ? C.lunaBlueDeep : 'rgba(255,255,255,.74)',
          } as const;

          // The whole tab is the target. Hanging onPress off the label instead
          // left the corners dead, which reads as the app dropping taps.
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              style={{ flex: 1 }}>
              <Grad g={focused ? G.tabActive : G.glassTab} style={[shape, focused && SH.appbar]}>
                <Text style={text}>{label}</Text>
              </Grad>
            </Pressable>
          );
        })}
      </Grad>
    </View>
  );
}

/** `.appbar .fizz` — bubbles rising through the header glass. */
function Fizz() {
  const bubbles = [
    { size: 14, left: '12%', duration: 11000, delay: 0 },
    { size: 8, left: '34%', duration: 8000, delay: 3000 },
    { size: 18, left: '62%', duration: 13000, delay: 6000 },
    { size: 6, left: '82%', duration: 7000, delay: 1000 },
  ] as const;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {bubbles.map((b, i) => (
        <Bubble key={i} {...b} />
      ))}
    </View>
  );
}

function Bubble({
  size,
  left,
  duration,
  delay,
}: {
  size: number;
  left: string;
  duration: number;
  delay: number;
}) {
  const p = useSharedValue(0);
  // Resolved on the JS side: `s` is a module function and cannot be called
  // from inside a worklet.
  const rise = s(64);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, [duration, delay, p]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -p.value * rise }, { scale: 0.7 + p.value * 0.4 }],
    // Fade in fast, then out across the rest of the rise.
    opacity: p.value < 0.18 ? (p.value / 0.18) * 0.55 : 0.55 * (1 - (p.value - 0.18) / 0.82),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: -s(14),
          left: left as unknown as number,
          width: s(size),
          height: s(size),
          borderRadius: s(size) / 2,
          backgroundColor: 'rgba(255,255,255,.4)',
        },
        style,
      ]}
    />
  );
}

export { R };
