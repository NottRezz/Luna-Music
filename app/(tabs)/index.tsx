/**
 * Search — `#view-search` in design/mockup/index.html.
 *
 * Submitting a query swaps the browse stack for real iTunes results.
 *
 * The browse sections were the mockup's verbatim, which meant they printed
 * fiction: four playlists the account did not own, five searches it had not
 * run, three tracks it had not played, a "Luna Radio" channel with 2,418
 * listeners that does not exist, and four mood tiles implying a curated model
 * behind a plain text search. What is left is the account's own data, an empty
 * state where it has none, and a search field that does exactly what it says.
 */

import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Art } from '@/components/aero/art';
import { SearchIcon } from '@/components/aero/icon';
import { Chip, Field, Grad, Press, SectionLabel } from '@/components/aero/primitives';
import { QueueRow, TrackRow } from '@/components/aero/track-row';
import { Empty } from '@/components/empty';
import { Screen } from '@/components/screen';
import { C, F, G, R, SCROLL, SH, s } from '@/constants/aero';
import { useLibrary } from '@/providers/library';
import { searchItunes, usePlayer } from '@/providers/player';
import { useToast } from '@/providers/toast';
import { useUI } from '@/providers/ui';
import type { Track } from '@/types/music';

export default function SearchScreen() {
  const router = useRouter();
  const { playlists, recents, history, statsOf, rememberSearch, clearRecents, setActivePlaylist } =
    useLibrary();
  const { play, track: current, playing } = usePlayer();
  const { promptAddToPlaylist } = useUI();
  const { notify } = useToast();

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
        // Not the same thing as zero results, and it used to render as
        // "Nothing matched" — which blames the query for a network failure.
        setResults(null);
        notify('Search failed. Check your connection and try again.');
      } finally {
        if (token === searchToken.current) setLoading(false);
      }
    },
    [rememberSearch, notify],
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
        {/* Was a green "AI" button, which ran exactly the same plain iTunes
            search as the return key. It is a search button, so it says so. */}
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
            <SearchIcon size={s(18)} color="#fff" />
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
                  onAdd={() => promptAddToPlaylist(t)}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          {recents.length > 0 ? (
            <>
              <SectionLabel action="Clear" onAction={clearRecents}>
                Recent
              </SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s(6) }}>
                {recents.map((r) => (
                  <Chip key={r} label={r} onPress={() => run(r)} />
                ))}
              </View>
            </>
          ) : null}

          <SectionLabel>Your playlists</SectionLabel>
          {playlists.length === 0 ? (
            <Empty
              icon="list"
              title="No playlists yet"
              hint="Search for a song, then tap the + beside it to start one."
            />
          ) : (
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
                              {stats.count} {stats.count === '1' ? 'TRACK' : 'TRACKS'}
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
                      </Text>
                    </View>
                  </Press>
                );
              })}
            </ScrollView>
          )}

          {/* Moods are gone with the rest of the browse chrome. They ran a real
              iTunes search for their own name, so they were not dishonest the
              way the radio ticker was — but "Focus / Deep & clean" implied a
              curated mood model that does not exist, and searching the literal
              word "Focus" is not that. A real one filters something. */}

          {/* `.ticker` is gone. It advertised "Luna Radio · Aero Channel" with
              "2,418 listening now" over a button that ran a text search for
              "aero chill". There is no radio, no channel and no listener count
              to report — it was a decorative lie, and the one piece of this
              screen that could not be made true by pointing it at real data. */}

          <SectionLabel>Jump back in</SectionLabel>
          {history.length === 0 ? (
            <Empty
              icon="clock"
              title="Nothing played yet"
              hint="Songs you play show up here, newest first, on every device you sign in to."
            />
          ) : (
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
                  onAdd={() => promptAddToPlaylist(h.track)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
