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
import { Icon } from './icon';
import { Eq, Grad, Press, rowText } from './primitives';

/**
 * The row's trailing action — "+" to add to a playlist, a bin to remove.
 *
 * Both used to be long-press only. The gesture worked, but nothing on screen
 * said it existed, so the feature was effectively missing: the first thing
 * anyone said about the app was that there was no way to add a song to a
 * playlist. A hidden gesture is not a feature. Long-press still works as a
 * shortcut; this is the discoverable path.
 *
 * `hitSlop` matters more than the drawn size here. The button is deliberately
 * small so it does not compete with the artwork, which would otherwise leave a
 * target well under the 44px everyone recommends.
 */
function RowAction({
  icon,
  label,
  onPress,
  onLight,
  tint,
}: {
  icon: 'plus' | 'trash';
  label: string;
  onPress: () => void;
  /** Sitting on the orange playing row, where blue-on-orange would vibrate. */
  onLight?: boolean;
  tint?: string;
}) {
  const color = onLight ? '#fff' : (tint ?? C.lunaBlue);
  return (
    <Press onPress={onPress} scale={0.88} style={{ marginLeft: s(2) }}>
      <View
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={s(10)}
        style={{
          width: s(26),
          height: s(26),
          borderRadius: s(13),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: onLight ? 'rgba(255,255,255,.28)' : 'rgba(36,94,219,.09)',
        }}>
        <Icon name={icon} size={s(15)} color={color} />
      </View>
    </Press>
  );
}

export function TrackRow({
  track,
  index,
  current = false,
  playing = false,
  onPress,
  onLongPress,
  onAdd,
  onRemove,
}: {
  track: Track;
  index: number;
  current?: boolean;
  playing?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Shows the visible "+" affordance. */
  onAdd?: () => void;
  /** Shows a bin instead of the "+", for rows already in a playlist. */
  onRemove?: () => void;
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

      {onRemove ? (
        <RowAction
          icon="trash"
          label={`Remove ${track.title} from this playlist`}
          onPress={onRemove}
          onLight={current}
          tint={C.ink3}
        />
      ) : onAdd ? (
        <RowAction icon="plus" label={`Add ${track.title} to a playlist`} onPress={onAdd} onLight={current} />
      ) : null}
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
  onAdd,
}: {
  track: Track;
  /** Replaces the artist line, e.g. "Vista Kids · 2 days ago". */
  note?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onAdd?: () => void;
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
        {onAdd ? (
          <RowAction icon="plus" label={`Add ${track.title} to a playlist`} onPress={onAdd} />
        ) : null}
      </View>
    </Press>
  );
}
