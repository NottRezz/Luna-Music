/**
 * Profile — `#view-profile` in design/mockup/index.html.
 *
 * Backed by the Supabase session + profiles table (ADR 4). Sign out clears the
 * SecureStore-cached session token.
 */

import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Art } from '@/components/aero/art';
import {
  AeroButton,
  AeroSwitch,
  Card,
  Field,
  Press,
  SectionLabel,
  Segmented,
} from '@/components/aero/primitives';
import { Icon } from '@/components/aero/icon';
import { Screen } from '@/components/screen';
import { C, F, R, SH, s, textShadow } from '@/constants/aero';
import type { ArtKey } from '@/constants/art';
import { updateProfile } from '@/lib/db/profiles';
import { useAuth } from '@/providers/auth';
import { useLibrary } from '@/providers/library';

const QUALITY = ['Normal', 'High', 'Lossless'] as const;

function asArtKey(value: string | null | undefined): ArtKey {
  const key = value ?? 'e';
  return (['a', 'b', 'c', 'd', 'e', 'f'] as const).includes(key as ArtKey)
    ? (key as ArtKey)
    : 'e';
}

export default function ProfileScreen() {
  const { user, profile, signOut, updateLocalProfile, refreshProfile } = useAuth();
  const { library, playlists, history } = useLibrary();

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'Listener';
  const username = profile?.username || 'user';
  const email = user?.email || '';
  const initials = initialsOf(displayName);

  const [nameDraft, setNameDraft] = useState(displayName);
  const [usernameDraft, setUsernameDraft] = useState(username);
  const [reveal, setReveal] = useState(false);
  const [password, setPassword] = useState('••••••••');
  const [quality, setQuality] = useState<string>('Lossless');
  const [offline, setOffline] = useState(true);
  const [crossfade, setCrossfade] = useState(false);
  const [explicit, setExplicit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(displayName);
    setUsernameDraft(username);
  }, [displayName, username]);

  const stats = useMemo(
    () => [
      { v: String(library.length), k: 'Songs' },
      { v: String(playlists.filter((p) => p.custom).length), k: 'Playlists' },
      { v: String(history.length), k: 'Recent' },
    ],
    [library.length, playlists, history.length],
  );

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const next = await updateProfile(user.id, {
        display_name: nameDraft.trim() || null,
        username: usernameDraft.trim().toLowerCase() || null,
      });
      updateLocalProfile(next);
      setMessage('Saved.');
      await refreshProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save profile.';
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {/* `.profile-card` */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: s(13), padding: s(13) }}>
        <Art source={asArtKey(profile?.avatar_art)} size={s(58)} radius={s(17)} style={SH.artLg}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                fontFamily: F.black,
                fontSize: s(20),
                letterSpacing: s(20) * 0.03,
                color: '#fff',
                ...textShadow(0.45, 5),
              }}>
              {initials}
            </Text>
          </View>
        </Art>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.black, fontSize: s(16), color: C.ink }}>{displayName}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: s(10.5), color: C.ink3 }}>@{username}</Text>
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: s(4),
              paddingVertical: s(2),
              paddingHorizontal: s(7),
              borderRadius: 999,
              backgroundColor: C.orange,
            }}>
            <Text
              style={{
                fontFamily: F.black,
                fontSize: s(8),
                letterSpacing: s(8) * 0.12,
                color: '#6b3d05',
              }}>
              {(profile?.plan || 'FREE').toUpperCase()}
            </Text>
          </View>
        </View>
      </Card>

      {/* `.profile-stats` */}
      <View style={{ flexDirection: 'row', gap: s(8), marginTop: s(10) }}>
        {stats.map((st) => (
          <View
            key={st.k}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: s(10),
              borderRadius: R.md,
              backgroundColor: 'rgba(255,255,255,.7)',
              borderWidth: 1,
              borderColor: C.hairline,
            }}>
            <Text style={{ fontFamily: F.black, fontSize: s(16), color: C.ink }}>{st.v}</Text>
            <Text style={{ fontFamily: F.bold, fontSize: s(9.5), color: C.ink3 }}>{st.k}</Text>
          </View>
        ))}
      </View>

      <SectionLabel>Account</SectionLabel>
      <View style={{ gap: s(9) }}>
        <FormRow label="Display name">
          <Field icon="person" value={nameDraft} onChangeText={setNameDraft} autoComplete="name" />
        </FormRow>

        <FormRow label="Username">
          <Field
            icon="person"
            value={usernameDraft}
            onChangeText={setUsernameDraft}
            autoComplete="username"
            autoCapitalize="none"
          />
        </FormRow>

        <FormRow label="Email">
          <Field
            icon="mail"
            value={email}
            editable={false}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </FormRow>

        <FormRow label="Password">
          <Field
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!reveal}
            editable={false}
            autoComplete="current-password"
            right={
              <Press onPress={() => setReveal(!reveal)} scale={0.9}>
                <Icon name="eye" size={s(16)} color={reveal ? C.lunaBlue : C.ink3} />
              </Press>
            }
          />
        </FormRow>
      </View>

      {message ? (
        <Text
          style={{
            fontFamily: F.bold,
            fontSize: s(11),
            color: C.ink2,
            marginTop: s(8),
            marginLeft: s(2),
          }}>
          {message}
        </Text>
      ) : null}

      <SectionLabel>Playback</SectionLabel>
      <Segmented options={QUALITY} value={quality} onChange={setQuality} style={{ marginTop: 0 }} />

      <View style={{ gap: s(7), marginTop: s(10) }}>
        <AeroSwitch
          title="Offline downloads"
          subtitle="Keep saved music on device"
          value={offline}
          onChange={setOffline}
        />
        <AeroSwitch
          title="Crossfade"
          subtitle="Blend tracks by 6 seconds"
          value={crossfade}
          onChange={setCrossfade}
        />
        <AeroSwitch
          title="Explicit content"
          subtitle="Allow in recommendations"
          value={explicit}
          onChange={setExplicit}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: s(8), marginTop: s(14) }}>
        <AeroButton
          label={saving ? 'Saving…' : 'Save changes'}
          style={{ flex: 1 }}
          onPress={saving ? undefined : () => void onSave()}
        />
        <AeroButton label="Sign out" variant="quiet" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text
        style={{
          fontFamily: F.extrabold,
          fontSize: s(9.5),
          letterSpacing: s(9.5) * 0.06,
          color: C.ink2,
          textTransform: 'uppercase',
          marginBottom: s(5),
          marginLeft: s(2),
        }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row' }}>{children}</View>
    </View>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
