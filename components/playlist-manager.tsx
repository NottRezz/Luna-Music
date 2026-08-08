/**
 * Playlist manager — create, rename, delete and switch.
 *
 * Opened from the "More options" button that the mockup already draws in
 * `.pl-actions` but leaves inert, so playlist management costs no visual
 * change. Mounted at the root rather than inside the Playlist screen because
 * `.sheet` is `inset: 0` over the whole shell: it has to dim and cover the dock,
 * which a sheet rendered inside the navigator cannot reach.
 */

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Art } from '@/components/aero/art';
import { Icon } from '@/components/aero/icon';
import { AeroButton, Field, Grad, Press, SectionLabel } from '@/components/aero/primitives';
import { Sheet, SheetGrabber } from '@/components/aero/sheet';
import { C, DOWN, F, G, SCROLL, SH, s } from '@/constants/aero';
import { useLibrary } from '@/providers/library';
import { useUI } from '@/providers/ui';

export function PlaylistManager() {
  const {
    playlists, activePlaylistId, statsOf,
    setActivePlaylist, createPlaylist, renamePlaylist, deletePlaylist,
  } = useLibrary();
  const { managerOpen, closeManager } = useUI();

  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const create = () => {
    const t = name.trim();
    if (!t) return;
    setActivePlaylist(createPlaylist(t));
    setName('');
    closeManager();
  };

  const commitRename = () => {
    if (editing && draft.trim()) renamePlaylist(editing, draft.trim());
    setEditing(null);
  };

  const switchTo = (id: string) => {
    setActivePlaylist(id);
    closeManager();
  };

  return (
    <Sheet open={managerOpen} onClose={closeManager} handle={<SheetGrabber />}>
      <View
        style={{ paddingHorizontal: s(14), paddingBottom: s(14) + insets.bottom, flexShrink: 1 }}>
        <SectionLabel>New playlist</SectionLabel>
        <View style={{ flexDirection: 'row', gap: s(8) }}>
          <Field
            icon="note"
            placeholder="Playlist name…"
            value={name}
            onChangeText={setName}
            onSubmitEditing={create}
            returnKeyType="done"
          />
          <AeroButton label="Create" icon="plus" onPress={create} />
        </View>

        <SectionLabel>Switch playlist</SectionLabel>
        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} {...SCROLL}>
          <View style={{ gap: s(5) }}>
            {playlists.map((p) => {
              const active = p.id === activePlaylistId;
              const isEditing = editing === p.id;

              return (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(10),
                    padding: s(8),
                    borderRadius: s(10),
                    backgroundColor: active ? 'rgba(58,123,253,.12)' : 'rgba(255,255,255,.7)',
                    borderWidth: 1,
                    borderColor: active ? C.lunaBlueLight : 'transparent',
                  }}>
                  <Art source={p.art} size={s(34)} radius={s(8)} style={SH.art} />

                  {isEditing ? (
                    <Field
                      icon="pencil"
                      value={draft}
                      onChangeText={setDraft}
                      onSubmitEditing={commitRename}
                      onBlur={commitRename}
                      autoFocus
                      returnKeyType="done"
                    />
                  ) : (
                    <Press onPress={() => switchTo(p.id)} scale={0.99} style={{ flex: 1 }}>
                      <View style={{ minWidth: 0 }}>
                        <Text
                          numberOfLines={1}
                          style={{ fontFamily: F.extrabold, fontSize: s(12), color: C.ink }}>
                          {p.name}
                        </Text>
                        {/* Printed figures for the seeded playlists, real ones
                            for the user's own — matching the hero and carousel. */}
                        <Text style={{ fontFamily: F.bold, fontSize: s(9.5), color: C.ink3 }}>
                          {p.custom ? 'Yours' : p.owner} · {statsOf(p).count} tracks
                        </Text>
                      </View>
                    </Press>
                  )}

                  {/* Seeded playlists stand in for server data, so they are read-only. */}
                  {p.custom && !isEditing ? (
                    <View style={{ flexDirection: 'row', gap: s(4) }}>
                      <MiniBtn
                        icon="pencil"
                        onPress={() => {
                          setEditing(p.id);
                          setDraft(p.name);
                        }}
                      />
                      <MiniBtn icon="trash" tone="red" onPress={() => deletePlaylist(p.id)} />
                    </View>
                  ) : null}

                  {isEditing ? <MiniBtn icon="check" onPress={commitRename} /> : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Sheet>
  );
}

function MiniBtn({
  icon,
  tone = 'blue',
  onPress,
}: {
  icon: 'pencil' | 'trash' | 'check';
  tone?: 'blue' | 'red';
  onPress: () => void;
}) {
  return (
    <Press onPress={onPress} scale={0.9}>
      <Grad
        g={tone === 'red' ? { colors: ['#f97b6f', C.red], ...DOWN } : G.btnBlue}
        style={{
          width: s(28),
          height: s(28),
          borderRadius: s(14),
          alignItems: 'center',
          justifyContent: 'center',
          ...SH.btn,
        }}>
        <Icon name={icon} size={s(15)} color="#fff" />
      </Grad>
    </Press>
  );
}
