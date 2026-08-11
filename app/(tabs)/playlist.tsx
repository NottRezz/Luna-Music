/**
 * Playlist — `#view-playlist` in design/mockup/index.html.
 *
 * The layout is the mockup's exactly. Playlist management hangs off the
 * "More options" button that the design already includes, so creating,
 * renaming and switching playlists costs no visual change; the sheet itself
 * lives at the root (see components/playlist-manager.tsx).
 */

import { Text, View } from 'react-native';

import { Art } from '@/components/aero/art';
import { AeroButton, Card, IconSq, SectionLabel, StatTile } from '@/components/aero/primitives';
import { TrackRow } from '@/components/aero/track-row';
import { Empty } from '@/components/empty';
import { Screen } from '@/components/screen';
import { C, F, R, SH, s } from '@/constants/aero';
import { useLibrary } from '@/providers/library';
import { usePlayer } from '@/providers/player';
import { useToast } from '@/providers/toast';
import { useUI } from '@/providers/ui';

export default function PlaylistScreen() {
  const { activePlaylist, tracksOf, statsOf, removeFromPlaylist } = useLibrary();
  const { play, track: current, playing, shuffle, setShuffle } = usePlayer();
  const { openManager } = useUI();
  const { notify } = useToast();

  // The account can now genuinely have no playlists — there are no seeded ones
  // underneath to fall back to — so this screen has to stand on its own.
  if (!activePlaylist) {
    return (
      <Screen>
        <Empty
          icon="list"
          title="No playlists yet"
          hint="Find a song in Search, press and hold it, and you can start your first playlist from there."
        />
        <AeroButton
          label="New playlist"
          icon="plus"
          onPress={openManager}
          style={{ marginTop: s(12) }}
        />
      </Screen>
    );
  }

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
            {stats.count} {stats.count === '1' ? 'track' : 'tracks'} · {stats.runtime}
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
        {/* The heart is gone. It was local state that defaulted to on, so every
            playlist opened already hearted, and nothing stored it — there is no
            "liked playlist" anywhere in the schema. Liking a *track* is real and
            lives in Now Playing. */}
        <IconSq name="more" onPress={openManager} />
      </View>

      {/* `.stat-strip`, two tiles rather than three. The mockup's third was
          "SAVED", a count of other people saving your playlist — there is no
          sharing, so nothing could ever produce that number. Seeded playlists
          printed 312, 204, 488; real ones printed 0 forever. */}
      <View style={{ flexDirection: 'row', gap: s(8), marginTop: s(10) }}>
        <StatTile k="TRACKS" v={stats.count} tone="blue" />
        <StatTile k="PLAYTIME" v={stats.runtime} tone="orange" />
      </View>

      <SectionLabel>Tracks</SectionLabel>
      {tracks.length === 0 ? (
        <Empty
          icon="note"
          title="This playlist is empty"
          hint="Search for a song, then press and hold it to add it here."
        />
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
              // Every playlist is the account's own now, so long-press always
              // means remove. It used to branch on `custom` because the seeded
              // ones could not be edited.
              onLongPress={() =>
                void removeFromPlaylist(activePlaylist.id, t.id).catch((err) => {
                  console.warn('removeFromPlaylist failed:', err);
                  notify('Could not remove that song.');
                })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
