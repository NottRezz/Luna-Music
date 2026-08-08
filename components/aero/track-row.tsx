/**
 * `.track` and `.q-item` — the two list rows in the design.
 *
 * A playing row swaps its index for a live meter and turns orange; that is the
 * only warm accent in the whole interface, so it does a lot of work.
 */

import { Text, View } from 'react-native';

import { C, F, G, R, SH, s, textShadow } from '@/constants/aero';
import { artOf, mmss, type Track } from '@/types/music';
import { Art } from './art';
import { Eq, Grad, Press, rowText } from './primitives';

export function TrackRow({
  track,
  index,
  current = false,
  playing = false,
  onPress,
  onLongPress,
}: {
  track: Track;
  index: number;
  current?: boolean;
  playing?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const body = (
    <>
      <View style={{ width: s(15), alignItems: 'center' }}>
        {current ? (
          <Eq color="#fff" playing={playing} />
        ) : (
          <Text style={{ fontFamily: F.extrabold, fontSize: s(10), color: C.ink3 }}>
            {index + 1}
          </Text>
        )}
      </View>

      <Art source={artOf(track)} size={s(36)} radius={R.sm} style={SH.art} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={[rowText.title, current && { color: '#fff', ...textShadow(0.16) }]}>
          {track.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[rowText.sub, current && { color: 'rgba(255,255,255,.9)' }]}>
          {track.artist}
        </Text>
      </View>

      <Text style={[rowText.dur, current && { color: 'rgba(255,255,255,.9)' }]}>
        {mmss(track.duration)}
      </Text>
    </>
  );

  const layout = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingVertical: s(6),
    paddingLeft: s(7),
    paddingRight: s(9),
    borderRadius: s(10),
  } as const;

  return (
    <Press onPress={onPress} onLongPress={onLongPress} scale={0.985}>
      {current ? (
        <Grad g={G.trackCurrent} style={[layout, SH.hot]}>
          {body}
        </Grad>
      ) : (
        <View
          style={[
            layout,
            { backgroundColor: 'rgba(255,255,255,.66)', borderWidth: 1, borderColor: 'transparent' },
          ]}>
          {body}
        </View>
      )}
    </Press>
  );
}

/** `.q-item` — the lighter row used by "Jump back in" and "Up next". */
export function QueueRow({
  track,
  note,
  onPress,
  onLongPress,
}: {
  track: Track;
  /** Replaces the artist line, e.g. "Vista Kids · 2 days ago". */
  note?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Press onPress={onPress} onLongPress={onLongPress} scale={0.985}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: s(9),
          paddingVertical: s(5),
          paddingHorizontal: s(8),
          borderRadius: s(10),
          backgroundColor: 'rgba(255,255,255,.7)',
        }}>
        <Art source={artOf(track)} size={s(30)} radius={s(7)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.extrabold, fontSize: s(11), color: C.ink }}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={rowText.sub}>
            {note ?? track.artist}
          </Text>
        </View>
        <Text style={rowText.dur}>{mmss(track.duration)}</Text>
      </View>
    </Press>
  );
}
