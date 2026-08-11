/**
 * "Add to playlist" prompt.
 *
 * Reachable by long-pressing any track row or search result. Every playlist
 * belongs to the signed-in account and syncs through Supabase, so all of them
 * can be added to — this used to filter out four seeded read-only ones.
 */

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Art } from '@/components/aero/art';
import { AeroButton, Field, Grad, Press, SectionLabel } from '@/components/aero/primitives';
import { Sheet, SheetGrabber } from '@/components/aero/sheet';
import { Icon } from '@/components/aero/icon';
import { C, F, G, R, SCROLL, SH, s } from '@/constants/aero';
import { useLibrary } from '@/providers/library';
import { useToast } from '@/providers/toast';
import { useUI } from '@/providers/ui';
import { artOf } from '@/types/music';

export function AddToPlaylist() {
  const { pendingTrack, dismissAddToPlaylist } = useUI();
  const { playlists, createPlaylist, addToPlaylist } = useLibrary();
  const { notify } = useToast();
  const [name, setName] = useState('');

  const mine = playlists;

  const close = () => {
    setName('');
    dismissAddToPlaylist();
  };

  const add = (playlistId: string) => {
    if (!pendingTrack) return;
    void addToPlaylist(playlistId, pendingTrack).catch((err) => {
      console.warn('addToPlaylist failed:', err);
      notify('Could not add that song to the playlist.');
    });
    close();
  };

  const createAndAdd = () => {
    const trimmed = name.trim();
    if (!trimmed || !pendingTrack) return;
    const track = pendingTrack;
    void createPlaylist(trimmed)
      .then((id) => addToPlaylist(id, track))
      .then(() => close())
      .catch((err) => console.warn('createAndAdd failed:', err));
  };

  const insets = useSafeAreaInsets();

  return (
    <Sheet open={!!pendingTrack} onClose={close} handle={<SheetGrabber />}>
      <View style={{ paddingHorizontal: s(14), paddingBottom: s(14) + insets.bottom, flexShrink: 1 }}>
        {pendingTrack ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(10), marginTop: s(4) }}>
            <Art source={artOf(pendingTrack)} size={s(40)} radius={R.sm} style={SH.art} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: s(13), color: C.ink }}>
                {pendingTrack.title}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: s(10), color: C.ink3 }}>
                {pendingTrack.artist}
              </Text>
            </View>
          </View>
        ) : null}

        <SectionLabel>New playlist</SectionLabel>
        <View style={{ flexDirection: 'row', gap: s(8) }}>
          <Field
            icon="note"
            placeholder="Playlist name…"
            value={name}
            onChangeText={setName}
            onSubmitEditing={createAndAdd}
            returnKeyType="done"
          />
          <AeroButton label="Create" icon="plus" onPress={createAndAdd} />
        </View>

        <SectionLabel>Your playlists</SectionLabel>
        {mine.length === 0 ? (
          <Text style={{ fontFamily: F.bold, fontSize: s(11), color: C.ink3, paddingVertical: s(6) }}>
            You haven&apos;t made any playlists yet.
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: s(220) }} showsVerticalScrollIndicator={false} {...SCROLL}>
            <View style={{ gap: s(5) }}>
              {mine.map((p) => (
                <Press key={p.id} onPress={() => add(p.id)} scale={0.985}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: s(10),
                      padding: s(8),
                      borderRadius: s(10),
                      backgroundColor: 'rgba(255,255,255,.7)',
                    }}>
                    <Art source={p.art} size={s(34)} radius={s(8)} style={SH.art} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.extrabold, fontSize: s(12), color: C.ink }}>
                        {p.name}
                      </Text>
                      <Text style={{ fontFamily: F.bold, fontSize: s(9.5), color: C.ink3 }}>
                        {p.trackIds.length} {p.trackIds.length === 1 ? 'track' : 'tracks'}
                      </Text>
                    </View>
                    <Grad
                      g={G.btnBlue}
                      style={{
                        width: s(26),
                        height: s(26),
                        borderRadius: s(13),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Icon name="plus" size={s(15)} color="#fff" />
                    </Grad>
                  </View>
                </Press>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Sheet>
  );
}
