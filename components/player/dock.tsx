/**
 * `.dock` — the persistent mini player.
 *
 * Sits at the bottom of every screen and outlives tab changes because it is
 * mounted at the root, not inside the navigator. Tapping it opens Now Playing.
 */

import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Art } from '@/components/aero/art';
import { Eq, Grad, RoundBtn } from '@/components/aero/primitives';
import { C, F, G, H, R, SH, s } from '@/constants/aero';
import { usePlayer, usePlayerProgress } from '@/providers/player';
import { useUI } from '@/providers/ui';
import { artOf } from '@/types/music';

export function Dock() {
  const { track, playing, toggle, next, prev } = usePlayer();
  const { openNowPlaying, nowPlayingOpen } = useUI();
  const insets = useSafeAreaInsets();

  // Nothing has been played yet — the design has no empty state for the dock,
  // so it simply isn't there until it has something to show.
  if (!track || nowPlayingOpen) return null;

  return (
    // In flow, as `.dock { position: relative }` is: the mockup's shell is a
    // four-row grid — appbar / tabs / views / dock — and only the views row
    // flexes. `Screen` must therefore not reserve clearance of its own.
    <Pressable onPress={openNowPlaying}>
      <Grad
        g={G.dock}
        style={{
          height: H.dock + insets.bottom,
          paddingBottom: insets.bottom,
          paddingHorizontal: s(10),
          flexDirection: 'row',
          alignItems: 'center',
          gap: s(10),
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,.9)',
          ...SH.dock,
        }}>
        <Rail />

        <Art source={artOf(track)} size={s(42)} radius={s(9)} style={SH.art} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: F.black, fontSize: s(12), color: C.ink, flexShrink: 1 }}>
              {track.title}
            </Text>
            <Eq playing={playing} />
          </View>
          <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: s(9.5), color: C.ink3 }}>
            {track.artist}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(5) }}>
          <RoundBtn name="prev" size={30} onPress={prev} />
          <RoundBtn name={playing ? 'pause' : 'play'} size={38} variant="green" onPress={toggle} />
          <RoundBtn name="next" size={30} onPress={next} />
        </View>
      </Grad>
    </Pressable>
  );
}

/**
 * `.dock__rail` / `.dock__fill`.
 *
 * Its own component so the elapsed time — which lands four times a second — only
 * re-renders this three-pixel strip and not the artwork, titles and transport
 * around it.
 */
function Rail() {
  const { position, duration } = usePlayerProgress();
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: s(3),
        backgroundColor: 'rgba(126,159,196,.28)',
      }}>
      <Grad g={G.dockFill} style={{ height: '100%', width: `${progress * 100}%` }} />
    </View>
  );
}

export { R };
