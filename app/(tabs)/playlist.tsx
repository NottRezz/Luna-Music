/**
 * Playlist — `#view-playlist` in design/mockup/index.html.
 *
 * The layout is the mockup's exactly. Playlist management hangs off the
 * "More options" button that the design already includes, so creating,
 * renaming and switching playlists costs no visual change; the sheet itself
 * lives at the root (see components/playlist-manager.tsx).
 */

import { useState } from 'react';
import { Text, View } from 'react-native';

import { Art } from '@/components/aero/art';
import { AeroButton, Card, IconSq, SectionLabel, StatTile } from '@/components/aero/primitives';
import { TrackRow } from '@/components/aero/track-row';
import { Screen } from '@/components/screen';
import { C, F, R, SH, s } from '@/constants/aero';
import { useLibrary } from '@/providers/library';
import { usePlayer } from '@/providers/player';
import { useUI } from '@/providers/ui';

export default function PlaylistScreen() {
  const { activePlaylist, tracksOf, statsOf, removeFromPlaylist } = useLibrary();
  const { play, track: current, playing, shuffle, setShuffle } = usePlayer();
  const { promptAddToPlaylist, openManager } = useUI();

  const [liked, setLiked] = useState(true);

  const tracks = tracksOf(activePlaylist);
  const stats = statsOf(activePlaylist);
  const source = { kind: 'Playing from playlist', name: activePlaylist.name };

  return (
    <Screen>
      {/* `.pl-hero` */}
      <Card
        hero
        style={{ flexDirection: 'row', gap: s(12), alignItems: 'flex-end', padding: s(12) }}>
        <Art source={activePlaylist.art} size={s(84)} radius={R.md} style={SH.artLg} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: F.black,
              fontSize: s(8.5),
              letterSpacing: s(8.5) * 0.14,
              color: C.ink3,
              textTransform: 'uppercase',
            }}>
            Playlist
          </Text>
          <Text numberOfLines={2} style={{ fontFamily: F.black, fontSize: s(19), color: C.ink, marginVertical: s(2) }}>
            {activePlaylist.name}
          </Text>
          <Text style={{ fontFamily: F.bold, fontSize: s(10), color: C.ink2 }}>
            {activePlaylist.owner} · {stats.count} tracks
          </Text>
        </View>
      </Card>

      {/* `.pl-actions` */}
      <View style={{ flexDirection: 'row', gap: s(8), marginTop: s(10) }}>
        {/* `.pl-actions .btn:first-child { flex: 1 }` */}
        <AeroButton
          label="Play all"
          icon="play"
          style={{ flex: 1 }}
          onPress={() => tracks.length > 0 && play(tracks, 0, source)}
        />
        <IconSq name="shuffle" active={shuffle} onPress={() => setShuffle(!shuffle)} />
        <IconSq name="heart" active={liked} onPress={() => setLiked(!liked)} />
        <IconSq name="more" onPress={openManager} />
      </View>

      {/* `.stat-strip` */}
      <View style={{ flexDirection: 'row', gap: s(8), marginTop: s(10) }}>
        <StatTile k="TRACKS" v={stats.count} tone="blue" />
        <StatTile k="PLAYTIME" v={stats.runtime} tone="orange" />
        <StatTile k="SAVED" v={stats.saves} tone="green" />
      </View>

      <SectionLabel action="Sort: Custom">Tracks</SectionLabel>
      {tracks.length === 0 ? (
        <Text style={{ fontFamily: F.bold, fontSize: s(11), color: C.ink3 }}>
          Nothing here yet — long-press a song in Search to add it.
        </Text>
      ) : (
        <View style={{ gap: s(4) }}>
          {tracks.map((t, i) => (
            <TrackRow
              key={`${t.id}:${i}`}
              track={t}
              index={i}
              current={current?.id === t.id}
              playing={playing}
              onPress={() => play(tracks, i, source)}
              onLongPress={() =>
                activePlaylist.custom
                  ? void removeFromPlaylist(activePlaylist.id, t.id).catch((err) =>
                      console.warn('removeFromPlaylist failed:', err),
                    )
                  : promptAddToPlaylist(t)
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
