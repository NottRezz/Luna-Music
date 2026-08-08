/**
 * Library — `#view-library` in design/mockup/index.html.
 *
 * Songs lists everything the app knows about, including tracks pulled in from
 * search. Albums and Artists group the same pool rather than inventing a second
 * data source.
 */

import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Art } from '@/components/aero/art';
import { Icon } from '@/components/aero/icon';
import { Field, Press, SectionLabel, Segmented } from '@/components/aero/primitives';
import { TrackRow } from '@/components/aero/track-row';
import { Screen } from '@/components/screen';
import { C, F, R, SH, s, textShadow } from '@/constants/aero';
import { GENRES } from '@/constants/seed';
import { useLibrary } from '@/providers/library';
import { usePlayer } from '@/providers/player';
import { useUI } from '@/providers/ui';
import type { ArtKey } from '@/constants/art';

const VIEWS = ['Songs', 'Albums', 'Artists'] as const;

export default function LibraryScreen() {
  const { library } = useLibrary();
  const { play, track: current, playing } = usePlayer();
  const { promptAddToPlaylist } = useUI();

  const [filter, setFilter] = useState('');
  const [view, setView] = useState<string>('Songs');
  const [grid, setGrid] = useState(false);

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return library;
    return library.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
    );
  }, [library, filter]);

  /** Albums and Artists collapse the same track pool by their grouping key. */
  const groups = useMemo(() => {
    if (view === 'Songs') return null;
    const by = new Map<string, typeof matches>();
    for (const t of matches) {
      const key = view === 'Artists' ? t.artist : (t.label ?? t.title);
      by.set(key, [...(by.get(key) ?? []), t]);
    }
    return [...by.entries()];
  }, [matches, view]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row' }}>
        <Field
          placeholder="Filter your library…"
          value={filter}
          onChangeText={setFilter}
          returnKeyType="search"
        />
      </View>

      <Segmented options={VIEWS} value={view} onChange={setView} style={{ marginTop: s(10) }} />

      {/* `.sort-row` */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: s(10),
        }}>
        <Text style={{ fontFamily: F.extrabold, fontSize: s(10), color: C.ink2 }}>
          Recently added
        </Text>
        <View style={{ flexDirection: 'row', gap: s(4) }}>
          <ViewToggle icon="list" on={!grid} onPress={() => setGrid(false)} />
          <ViewToggle icon="grid" on={grid} onPress={() => setGrid(true)} />
        </View>
      </View>

      <View style={{ gap: s(4), marginTop: s(8) }}>
        {groups
          ? groups.map(([key, list]) => (
              <Press
                key={key}
                onPress={() => play(list, 0, { kind: `Playing from ${view.toLowerCase()}`, name: key })}
                scale={0.985}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(10),
                    paddingVertical: s(6),
                    paddingHorizontal: s(8),
                    borderRadius: s(10),
                    backgroundColor: 'rgba(255,255,255,.66)',
                  }}>
                  <Art source={list[0].art} size={s(36)} radius={R.sm} style={SH.art} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.extrabold, fontSize: s(12), color: C.ink }}>
                      {key}
                    </Text>
                    <Text style={{ fontFamily: F.bold, fontSize: s(9.5), color: C.ink3 }}>
                      {list.length} {list.length === 1 ? 'track' : 'tracks'}
                    </Text>
                  </View>
                </View>
              </Press>
            ))
          : matches.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                index={i}
                current={current?.id === t.id}
                playing={playing}
                onPress={() => play(matches, i, { kind: 'Playing from library', name: 'Your library' })}
                onLongPress={() => promptAddToPlaylist(t)}
              />
            ))}

        {matches.length === 0 ? (
          <Text style={{ fontFamily: F.bold, fontSize: s(11), color: C.ink3 }}>
            Nothing matched “{filter}”.
          </Text>
        ) : null}
      </View>

      <SectionLabel>Browse genres</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s(10) }}>
        {GENRES.map((g) => (
          <Press key={g.name} scale={0.98} style={{ width: '48%', flexGrow: 1 }}>
            <Art
              source={g.art as ArtKey}
              wide
              radius={R.md}
              style={{ height: s(62), ...SH.art }}>
              <View style={{ flex: 1, justifyContent: 'flex-end', paddingVertical: s(8), paddingHorizontal: s(10) }}>
                <Text style={{ fontFamily: F.black, fontSize: s(12.5), color: '#fff', ...textShadow(0.45, 4) }}>
                  {g.name}
                </Text>
                <Text
                  style={{
                    fontFamily: F.extrabold,
                    fontSize: s(8),
                    letterSpacing: s(8) * 0.12,
                    color: 'rgba(255,255,255,.92)',
                    ...textShadow(0.45, 3),
                  }}>
                  {g.count} TRACKS
                </Text>
              </View>
            </Art>
          </Press>
        ))}
      </View>
    </Screen>
  );
}

function ViewToggle({
  icon,
  on,
  onPress,
}: {
  icon: 'list' | 'grid';
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Press onPress={onPress} scale={0.92}>
      <View
        style={{
          width: s(28),
          height: s(24),
          borderRadius: s(7),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? 'rgba(58,123,253,.16)' : 'rgba(255,255,255,.7)',
          borderWidth: 1,
          borderColor: on ? C.lunaBlueLight : C.hairline,
        }}>
        <Icon name={icon} size={s(14)} color={on ? C.lunaBlue : C.ink3} />
      </View>
    </Press>
  );
}
