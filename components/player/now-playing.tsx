/**
 * The Now Playing sheet — `.sheet` in design/mockup/index.html.
 *
 * Full-height, slides over the whole app including the chrome, and is the only
 * place with a seek control.
 */

import { useEffect, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Art } from '@/components/aero/art';
import { Icon } from '@/components/aero/icon';
import { Grad, IconBtn, IconSq, Press, SectionLabel } from '@/components/aero/primitives';
import { Sheet } from '@/components/aero/sheet';
import { QueueRow } from '@/components/aero/track-row';
import { C, D160, DOWN, F, G, R, RIGHT, SH, s, textShadow } from '@/constants/aero';
import { usePlayer, usePlayerProgress, useVolume } from '@/providers/player';
import { useUI } from '@/providers/ui';
import { artOf, mmss } from '@/types/music';

export function NowPlaying() {
  const {
    track, queue, index, source, playing, liked, shuffle, repeat,
    toggle, next, prev, seek, setLiked, setShuffle, setRepeat, play,
  } = usePlayer();
  const { nowPlayingOpen, closeNowPlaying } = useUI();
  const insets = useSafeAreaInsets();

  if (!track) return null;

  const upNext = queue.slice(index + 1).concat(queue.slice(0, index));

  // `.sheet__bar` — also the drag handle, so the sheet can be pulled down from
  // the top while the body below it scrolls normally.
  const bar = (
    <View style={{ paddingTop: insets.top }}>
      <View
        style={{
          height: s(46),
          flexDirection: 'row',
          alignItems: 'center',
          gap: s(8),
          paddingHorizontal: s(10),
        }}>
          <Press onPress={closeNowPlaying}>
            <View
              style={{
                width: s(30),
                height: s(30),
                borderRadius: s(9),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="chevronDown" size={s(18)} color={C.ink2} />
            </View>
          </Press>

          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: F.black,
                fontSize: s(8),
                letterSpacing: s(8) * 0.16,
                color: C.ink3,
                textTransform: 'uppercase',
              }}>
              {source.kind}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: s(11), color: C.ink }}>
              {source.name}
            </Text>
          </View>

          <View style={{ width: s(30), alignItems: 'center' }}>
            <Icon name="more" size={s(18)} color={C.ink2} />
          </View>
      </View>
    </View>
  );

  return (
    <Sheet open={nowPlayingOpen} onClose={closeNowPlaying} full handle={bar}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: s(14), paddingBottom: s(24) + insets.bottom }}
          showsVerticalScrollIndicator={false}>
          {/* `.cover` — white frame around the artwork */}
          <Grad
            g={G.cover}
            style={{
              alignSelf: 'center',
              width: s(200),
              height: s(200),
              padding: s(8),
              borderRadius: s(20),
              ...SH.cover,
            }}>
            <Art source={artOf(track)} radius={s(13)} style={{ flex: 1 }}>
              <PortalRing />
              <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: s(16) }}>
                <Text
                  style={{
                    fontFamily: F.black,
                    fontSize: s(9.5),
                    letterSpacing: s(9.5) * 0.24,
                    color: '#eaf6ff',
                    ...textShadow(0.5, 3),
                  }}>
                  {track.label ?? track.title.toUpperCase()}
                </Text>
              </View>
            </Art>
          </Grad>

          <Viz playing={playing} />

          {/* `.np-head` */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(10), marginTop: s(8) }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: s(20), color: C.ink }}>
                {track.title}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontFamily: F.extrabold, fontSize: s(12), color: C.lunaBlueLight }}>
                {track.artist}
              </Text>
            </View>
            <IconSq name="heart" active={liked} onPress={() => setLiked(!liked)} />
          </View>

          {/* `.quality` */}
          <View style={{ flexDirection: 'row', gap: s(5), marginTop: s(9) }}>
            <QualityPill label="LOSSLESS" hot />
            <QualityPill label="320 KBPS" />
            <QualityPill label="STEREO" />
            <QualityPill label="48 KHZ" />
          </View>

          <Seek onSeek={seek} />

          {/* `.transport` */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: s(13),
              marginTop: s(14),
            }}>
            <TSide name="shuffle" active={shuffle} onPress={() => setShuffle(!shuffle)} />
            <TSkip name="prev" onPress={prev} />
            <TPlay playing={playing} onPress={toggle} />
            <TSkip name="next" onPress={next} />
            <TSide name="repeat" active={repeat} onPress={() => setRepeat(!repeat)} />
          </View>

          <Volume />

          {/* `.np-extras` */}
          <View style={{ flexDirection: 'row', gap: s(6), marginTop: s(14) }}>
            <NpPill icon="lyrics" label="Lyrics" />
            <NpPill icon="note" label="Similar" />
            <NpPill icon="clock" label="Timer" />
          </View>

          <SectionLabel action="Queue">Up next</SectionLabel>
          <View style={{ gap: s(4) }}>
            {upNext.map((t, i) => (
              <QueueRow
                key={`${t.id}:${i}`}
                track={t}
                onPress={() => play(queue, (index + 1 + i) % queue.length, source)}
              />
            ))}
          </View>
        </ScrollView>
    </Sheet>
  );
}

/* ============================================================
   Pieces
   ============================================================ */

/** `.cover__ring` — the breathing portal over the artwork. */
function PortalRing() {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [p]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + p.value * 0.08 }],
    opacity: 0.6 + p.value * 0.4,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: '21%',
          left: '21%',
          right: '21%',
          bottom: '21%',
          borderWidth: 2,
          borderColor: 'rgba(190,232,255,.55)',
          borderRadius: 999,
          zIndex: 3,
        },
        style,
      ]}
    />
  );
}

/** `.viz` — 26 bars, deliberately desynchronised so it never looks like a loop. */
function Viz({ playing }: { playing: boolean }) {
  const bars = Array.from({ length: 26 }, (_, i) => i);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: s(2.5),
        height: s(22),
        marginTop: s(12),
        marginBottom: s(2),
        opacity: 0.9,
      }}>
      {bars.map((i) => (
        <VizBar key={i} index={i} playing={playing} />
      ))}
    </View>
  );
}

function VizBar({ index, playing }: { index: number; playing: boolean }) {
  const h = useSharedValue(0.2);
  // Stable pseudo-random per bar so the pattern is fixed across renders.
  const seed = ((index * 9301 + 49297) % 233280) / 233280;
  const duration = 750 + seed * 750;

  useEffect(() => {
    if (!playing) {
      h.value = withTiming(0.2, { duration: 200 });
      return;
    }
    h.value = withRepeat(
      withSequence(
        withTiming(0.35 + seed * 0.65, { duration }),
        withTiming(0.2, { duration }),
      ),
      -1,
      true,
    );
  }, [playing, duration, seed, h]);

  const style = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));

  return (
    <Animated.View style={[{ width: s(3), borderRadius: 2, overflow: 'hidden' }, style]}>
      <Grad g={{ colors: [C.lunaBlueSky, C.lunaBlue], ...DOWN }} style={{ flex: 1 }} />
    </Animated.View>
  );
}

/**
 * `.seek` — draggable scrubber. Dragging detaches from playback until release.
 *
 * Subscribes to the ticking progress context itself rather than taking it as a
 * prop, which keeps the rest of the sheet — cover, visualizer, queue — out of
 * the four-times-a-second render.
 */
function Seek({ onSeek }: { onSeek: (s: number) => void }) {
  const { position, duration } = usePlayerProgress();
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);

  const shown = drag ?? (duration > 0 ? position / duration : 0);
  const pct = Math.max(0, Math.min(1, shown));

  const pan = Gesture.Pan()
    .onBegin((e) => setDrag(Math.max(0, Math.min(1, e.x / width))))
    .onUpdate((e) => setDrag(Math.max(0, Math.min(1, e.x / width))))
    .onEnd((e) => {
      const p = Math.max(0, Math.min(1, e.x / width));
      onSeek(p * duration);
      setDrag(null);
    })
    .runOnJS(true);

  const tap = Gesture.Tap()
    .onEnd((e) => onSeek(Math.max(0, Math.min(1, e.x / width)) * duration))
    .runOnJS(true);

  return (
    <View style={{ marginTop: s(14) }}>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View style={{ paddingVertical: s(8) }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <Grad
            g={{ colors: ['#c3daf1', '#d9e9f8'], ...DOWN }}
            style={{ height: s(7), borderRadius: 999 }}>
            <Grad
              g={{ colors: [C.lunaBlueDeep, C.lunaBlue, C.lunaBlueSky], locations: [0, 0.55, 1], ...RIGHT }}
              style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 999 }}
            />
          </Grad>

          <Grad
            g={{ colors: ['#ffe0ab', C.orangeHot], ...D160 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: `${pct * 100}%`,
              width: s(17),
              height: s(17),
              marginLeft: -s(8.5),
              marginTop: -s(8.5),
              borderRadius: s(8.5),
              borderWidth: 2,
              borderColor: '#fff',
              ...SH.btn,
            }}
          />
        </View>
      </GestureDetector>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: s(1) }}>
        <Text style={{ fontFamily: F.extrabold, fontSize: s(10.5), color: C.ink3 }}>
          {mmss(pct * duration)}
        </Text>
        <Text style={{ fontFamily: F.extrabold, fontSize: s(10.5), color: C.ink3 }}>
          -{mmss(duration - pct * duration)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Volume. Not part of the mockup — added on request — so it borrows `.seek`'s
 * geometry to sit inside the design rather than beside it, at a slightly
 * smaller scale because it is a setting and not the primary control. The handle
 * is cool rather than orange: orange is the design's single hot accent and it
 * belongs to playback position.
 *
 * This writes through on every drag frame so the level tracks the finger. It
 * can afford to because volume has a context to itself — nothing else in the
 * app re-renders.
 */
function Volume() {
  const { volume, muted, setVolume, toggleMute } = useVolume();
  const [width, setWidth] = useState(0);

  const pct = muted ? 0 : Math.max(0, Math.min(1, volume));
  const at = (x: number) => (width > 0 ? Math.max(0, Math.min(1, x / width)) : 0);

  const pan = Gesture.Pan()
    .onBegin((e) => setVolume(at(e.x)))
    .onUpdate((e) => setVolume(at(e.x)))
    .runOnJS(true);

  const tap = Gesture.Tap()
    .onEnd((e) => setVolume(at(e.x)))
    .runOnJS(true);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8), marginTop: s(12) }}>
      <Press onPress={toggleMute} scale={0.9}>
        <View
          style={{
            width: s(28),
            height: s(28),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon
            name={pct === 0 ? 'volumeOff' : 'volume'}
            size={s(17)}
            color={pct === 0 ? C.ink3 : C.ink2}
          />
        </View>
      </Press>

      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          style={{ flex: 1, paddingVertical: s(8) }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <Grad g={{ colors: ['#c3daf1', '#d9e9f8'], ...DOWN }} style={{ height: s(6), borderRadius: 999 }}>
            <Grad
              g={{ colors: [C.lunaBlueDeep, C.lunaBlueSky], ...RIGHT }}
              style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 999 }}
            />
          </Grad>

          <Grad
            g={{ colors: ['#ffffff', '#dbe9fa'], ...D160 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: `${pct * 100}%`,
              width: s(15),
              height: s(15),
              marginLeft: -s(7.5),
              marginTop: -s(7.5),
              borderRadius: s(7.5),
              borderWidth: 2,
              borderColor: C.lunaBlueLight,
              ...SH.btn,
            }}
          />
        </View>
      </GestureDetector>

      <Text
        style={{
          fontFamily: F.extrabold,
          fontSize: s(9.5),
          color: C.ink3,
          width: s(30),
          textAlign: 'right',
        }}>
        {Math.round(pct * 100)}%
      </Text>
    </View>
  );
}

function QualityPill({ label, hot = false }: { label: string; hot?: boolean }) {
  return (
    <Grad
      g={hot ? { colors: ['#ffd28a', C.orange], ...DOWN } : { colors: ['#ffffff', '#dfeaf7'], ...DOWN }}
      style={{
        paddingVertical: s(4),
        paddingHorizontal: s(8),
        borderRadius: 999,
        borderWidth: 1,
        borderColor: hot ? 'transparent' : C.hairline,
      }}>
      <Text
        style={{
          fontFamily: F.black,
          fontSize: s(8),
          letterSpacing: s(8) * 0.1,
          color: hot ? '#6b3d05' : C.ink2,
        }}>
        {label}
      </Text>
    </Grad>
  );
}

function TSide({
  name,
  active,
  onPress,
}: {
  name: 'shuffle' | 'repeat';
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Press onPress={onPress}>
      <View
        style={{
          width: s(36),
          height: s(36),
          borderRadius: s(18),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? 'rgba(255,140,26,.16)' : 'transparent',
        }}>
        <Icon name={name} size={s(18)} color={active ? C.orangeHot : C.ink2} />
      </View>
    </Press>
  );
}

function TSkip({ name, onPress }: { name: 'prev' | 'next'; onPress: () => void }) {
  return (
    <Press onPress={onPress}>
      <Grad
        g={{ colors: ['#6aa8f0', C.lunaBlue, C.lunaBlueDeep], locations: [0, 0.55, 1], ...DOWN }}
        style={{
          width: s(46),
          height: s(46),
          borderRadius: s(23),
          alignItems: 'center',
          justifyContent: 'center',
          ...SH.artLg,
        }}>
        <Icon name={name} size={s(20)} color="#fff" />
      </Grad>
    </Press>
  );
}

function TPlay({ playing, onPress }: { playing: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} scale={0.94}>
      <Grad
        g={{ colors: ['#86ee86', C.green, C.greenDeep], locations: [0, 0.52, 1], ...DOWN }}
        style={{
          width: s(62),
          height: s(62),
          borderRadius: s(31),
          alignItems: 'center',
          justifyContent: 'center',
          ...SH.cover,
        }}>
        <Icon name={playing ? 'pause' : 'play'} size={s(24)} color="#fff" />
      </Grad>
    </Press>
  );
}

function NpPill({ icon, label }: { icon: 'lyrics' | 'note' | 'clock'; label: string }) {
  return (
    <Press style={{ flex: 1 }}>
      <Grad
        g={{ colors: ['#ffffff', '#e4effb'], ...DOWN }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: s(5),
          paddingVertical: s(8),
          borderRadius: s(10),
          borderWidth: 1,
          borderColor: C.hairline,
        }}>
        <Icon name={icon} size={s(13)} color={C.ink2} />
        <Text
          style={{
            fontFamily: F.black,
            fontSize: s(9.5),
            letterSpacing: s(9.5) * 0.05,
            color: C.ink2,
            textTransform: 'uppercase',
          }}>
          {label}
        </Text>
      </Grad>
    </Press>
  );
}

export { IconBtn, R };
