/**
 * Search — `#view-search` in design/mockup/index.html.
 *
 * The browse sections are the mockup's, verbatim. The field itself is live:
 * submitting a query swaps the browse stack for real iTunes results.
 */

import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Art } from '@/components/aero/art';
import {
  AeroButton,
  Card,
  Chip,
  Field,
  Grad,
  Press,
  SectionLabel,
} from '@/components/aero/primitives';
import { QueueRow, TrackRow } from '@/components/aero/track-row';
import { Screen } from '@/components/screen';
import { C, F, G, R, SCROLL, SH, s, textShadow } from '@/constants/aero';
import { MOODS } from '@/constants/seed';
import { useLibrary } from '@/providers/library';
import { searchItunes, usePlayer } from '@/providers/player';
import { useUI } from '@/providers/ui';
import type { Track } from '@/types/music';

export default function SearchScreen() {
  const router = useRouter();
  const { playlists, recents, history, statsOf, rememberSearch, clearRecents, setActivePlaylist } =
    useLibrary();
  const { play, track: current, playing } = usePlayer();
  const { promptAddToPlaylist } = useUI();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(false);
  /** Discards a slow response once a newer search has been submitted. */
  const searchToken = useRef(0);

  const run = useCallback(
    async (term: string) => {
      const t = term.trim();
      if (!t) return;
      const token = ++searchToken.current;
      setQuery(t);
      setLoading(true);
      try {
        const found = await searchItunes(t);
        if (token !== searchToken.current) return;
        setResults(found);
        rememberSearch(t);
      } catch (err) {
        if (token !== searchToken.current) return;
        console.warn('Search failed:', err);
        setResults([]);
      } finally {
        if (token === searchToken.current) setLoading(false);
      }
    },
    [rememberSearch],
  );

  const clear = () => {
    // Also strands any in-flight search, which would otherwise repopulate the
    // list the user just dismissed.
    searchToken.current++;
    setQuery('');
    setResults(null);
    setLoading(false);
  };

  const openPlaylist = (id: string) => {
    setActivePlaylist(id);
    router.navigate('/playlist');
  };

  return (
    <Screen>
      {/* `.search-row` */}
      <View style={{ flexDirection: 'row', gap: s(8), alignItems: 'center' }}>
        <Field
          placeholder="Songs, artists, vibes…"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => run(query)}
          returnKeyType="search"
          // No clear affordance here: the mockup hides the native one
          // (`::-webkit-search-cancel-button`). Clearing lives on the results
          // header instead.
        />
        <Press onPress={() => run(query)}>
          <Grad
            g={G.btnGreen}
            style={{
              width: s(44),
              height: s(40),
              borderRadius: s(11),
              alignItems: 'center',
              justifyContent: 'center',
              ...SH.btn,
            }}>
            <Text
              style={{
                fontFamily: F.black,
                fontSize: s(11),
                letterSpacing: s(11) * 0.06,
                color: '#fff',
                ...textShadow(),
              }}>
              AI
            </Text>
          </Grad>
        </Press>
      </View>

      {results ? (
        <>
          <SectionLabel action="Clear" onAction={clear}>
            {loading ? 'Searching…' : `Results · ${results.length}`}
          </SectionLabel>

          {loading ? (
            <ActivityIndicator color={C.lunaBlue} style={{ marginTop: s(20) }} />
          ) : results.length === 0 ? (
            <Text style={{ fontFamily: F.bold, fontSize: s(11), color: C.ink3, marginTop: s(4) }}>
              Nothing matched “{query}”.
            </Text>
          ) : (
            <View style={{ gap: s(4) }}>
              {results.map((t, i) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  index={i}
                  current={current?.id === t.id}
                  playing={playing}
                  onPress={() => play(results, i, { kind: 'Playing from search', name: query })}
                  onLongPress={() => promptAddToPlaylist(t)}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <SectionLabel action="Clear" onAction={clearRecents}>
            Recent
          </SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s(6) }}>
            {recents.map((r) => (
              <Chip key={r} label={r} onPress={() => run(r)} />
            ))}
          </View>

          <SectionLabel action="See all">Made for you</SectionLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            {...SCROLL}
            style={{ marginHorizontal: -s(12) }}
            contentContainerStyle={{ gap: s(10), paddingHorizontal: s(12), paddingBottom: s(8), paddingTop: s(2) }}>
            {playlists.map((p) => {
              const stats = statsOf(p);
              return (
                <Press key={p.id} onPress={() => openPlaylist(p.id)} scale={0.97}>
                  <View style={{ width: s(120) }}>
                    <Art source={p.art} size={s(120)} radius={R.md} style={SH.art}>
                      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-start', padding: s(9) }}>
                        <View
                          style={{
                            backgroundColor: 'rgba(10,22,48,.42)',
                            paddingVertical: s(3),
                            paddingHorizontal: s(7),
                            borderRadius: 999,
                          }}>
                          <Text
                            style={{
                              fontFamily: F.black,
                              fontSize: s(8),
                              letterSpacing: s(8) * 0.12,
                              color: '#fff',
                            }}>
                            {stats.count} TRACKS
                          </Text>
                        </View>
                      </View>
                    </Art>
                    <Text
                      numberOfLines={1}
                      style={{ marginTop: s(7), fontFamily: F.extrabold, fontSize: s(11.5), color: C.ink }}>
                      {p.name}
                    </Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: s(9.5), color: C.ink3 }}>
                      {stats.runtime}
                      {p.note ? ` · ${p.note}` : ''}
                    </Text>
                  </View>
                </Press>
              );
            })}
          </ScrollView>

          <SectionLabel>Moods</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s(8) }}>
            {MOODS.map((m, i) => (
              <Press
                key={m.key}
                onPress={() => run(m.name)}
                scale={0.98}
                style={{ width: '48%', flexGrow: 1 }}>
                <Grad
                  g={[G.mood1, G.mood2, G.mood3, G.mood4][i]}
                  style={{
                    height: s(72),
                    borderRadius: R.md,
                    padding: s(10),
                    paddingHorizontal: s(11),
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                    ...SH.btn,
                  }}>
                  <Text style={{ fontSize: s(17) }}>{m.glyph}</Text>
                  <View>
                    <Text style={{ fontFamily: F.black, fontSize: s(12.5), color: '#fff' }}>{m.name}</Text>
                    <Text style={{ fontFamily: F.bold, fontSize: s(9), color: 'rgba(255,255,255,.82)' }}>
                      {m.sub}
                    </Text>
                  </View>
                </Grad>
              </Press>
            ))}
          </View>

          {/* `.ticker` */}
          <Card
            style={{
              marginTop: s(10),
              flexDirection: 'row',
              alignItems: 'center',
              gap: s(9),
              paddingVertical: s(9),
              paddingHorizontal: s(12),
            }}>
            <View
              style={{
                width: s(8),
                height: s(8),
                borderRadius: s(4),
                backgroundColor: C.greenBright,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extrabold, fontSize: s(10.5), color: C.ink }}>
                Luna Radio · Aero Channel
              </Text>
              <Text style={{ fontFamily: F.bold, fontSize: s(9), color: C.ink3 }}>
                2,418 listening now
              </Text>
            </View>
            <AeroButton label="Tune in" icon="play" variant="green" onPress={() => run('aero chill')} />
          </Card>

          <SectionLabel action="History">Jump back in</SectionLabel>
          <View style={{ gap: s(4) }}>
            {history.map((h, i) => (
              <QueueRow
                key={h.track.id}
                track={h.track}
                note={h.note}
                onPress={() =>
                  play(
                    history.map((x) => x.track),
                    i,
                    { kind: 'Playing from history', name: 'Jump back in' },
                  )
                }
                onLongPress={() => promptAddToPlaylist(h.track)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
