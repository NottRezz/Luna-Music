/**
 * `.sheet` + `.scrim` — the slide-up panel.
 *
 * Full-height for Now Playing, bottom-anchored for the smaller prompts. Both
 * use the mockup's timing: 420ms on cubic-bezier(.32,.72,0,1), which is a fast
 * start and a long settle.
 */

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Dimensions, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';

import { G, s } from '@/constants/aero';
import { Grad } from './primitives';

const SCREEN_H = Dimensions.get('window').height;
const TIMING = { duration: 420, easing: Easing.bezier(0.32, 0.72, 0, 1) };

export function Sheet({
  open,
  onClose,
  full = false,
  /** Vertical drag past this fraction of the sheet dismisses it. */
  dismissAt = 0.28,
  handle,
  style,
  children,
}: {
  open: boolean;
  onClose: () => void;
  full?: boolean;
  dismissAt?: number;
  /**
   * The drag affordance, pinned above `children`. Dragging is confined to it
   * on purpose: a pan across the whole sheet competes with the scroll views
   * inside, and the pan always won — the Now Playing sheet could not be
   * scrolled at all. Tapping the scrim still dismisses from anywhere.
   */
  handle?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const y = useSharedValue(SCREEN_H);
  const height = useSharedValue(full ? SCREEN_H : SCREEN_H * 0.6);
  // Kept in React state rather than derived from `y` — reading a shared value
  // during render is not allowed, and the sheet has to stay mounted until its
  // close animation finishes.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      y.value = withTiming(0, TIMING);
    } else {
      y.value = withTiming(height.value, TIMING, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [open, y, height]);

  const pan = Gesture.Pan()
    // Let a tap through: the handle carries buttons (the Now Playing chevron),
    // and an eager pan would swallow them.
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const past = y.value > height.value * dismissAt || e.velocityY > 900;
      if (past) {
        y.value = withTiming(height.value, TIMING, (done) => {
          if (done) runOnJS(onClose)();
        });
      } else {
        y.value = withTiming(0, TIMING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, y.value / height.value),
  }));

  // Fully off-screen — keep it out of the tree so the tabs below stay touchable.
  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(11,38,92,.34)' }, scrimStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        onLayout={(e) => {
          if (!full) height.value = e.nativeEvent.layout.height;
        }}
        style={[
          full
            ? StyleSheet.absoluteFillObject
            : { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%' },
          sheetStyle,
          style,
        ]}>
        <Grad
          g={G.sheet}
          style={[
            // Bottom sheets shrink to the parent's maxHeight rather than
            // overflowing it, so a long list clips into a scroll instead of
            // running off the bottom of the screen.
            full ? { flex: 1 } : { flexShrink: 1 },
            !full && { borderTopLeftRadius: s(20), borderTopRightRadius: s(20), overflow: 'hidden' },
          ]}>
          {handle ? (
            <GestureDetector gesture={pan}>
              <Animated.View>{handle}</Animated.View>
            </GestureDetector>
          ) : null}
          {children}
        </Grad>
      </Animated.View>
    </View>
  );
}

/** The drag affordance on bottom-anchored sheets. */
export function SheetGrabber() {
  return (
    <View style={{ alignItems: 'center', paddingTop: s(9), paddingBottom: s(3) }}>
      <View
        style={{
          width: s(38),
          height: s(4),
          borderRadius: 999,
          backgroundColor: 'rgba(126,159,196,.5)',
        }}
      />
    </View>
  );
}
