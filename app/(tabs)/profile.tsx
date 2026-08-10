/**
 * Profile — `#view-profile` in design/mockup/index.html.
 *
 * Seeded account data. Supabase replaces it next phase, at which point the
 * form and Sign out become real; the controls are wired to local state so the
 * screen behaves correctly in the meantime.
 */

import { useState } from 'react';
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
import { SEED_PROFILE } from '@/constants/seed';

const QUALITY = ['Normal', 'High', 'Lossless'] as const;

export default function ProfileScreen() {
  const [username, setUsername] = useState<string>(SEED_PROFILE.username);
  const [email, setEmail] = useState<string>(SEED_PROFILE.email);
  const [password, setPassword] = useState<string>(SEED_PROFILE.password);
  const [reveal, setReveal] = useState(false);
  const [quality, setQuality] = useState<string>('Lossless');
  const [offline, setOffline] = useState(true);
  const [crossfade, setCrossfade] = useState(false);
  const [explicit, setExplicit] = useState(true);

  return (
    <Screen>
      {/* `.profile-card` */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: s(13), padding: s(13) }}>
        <Art source="e" size={s(58)} radius={s(17)} style={SH.artLg}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                fontFamily: F.black,
                fontSize: s(20),
                letterSpacing: s(20) * 0.03,
                color: '#fff',
                ...textShadow(0.45, 5),
              }}>
              {SEED_PROFILE.initials}
            </Text>
          </View>
        </Art>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.black, fontSize: s(16), color: C.ink }}>
            {SEED_PROFILE.name}
          </Text>
          <Text style={{ fontFamily: F.bold, fontSize: s(10.5), color: C.ink3 }}>
            {SEED_PROFILE.handle}
          </Text>
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
              {SEED_PROFILE.plan}
            </Text>
          </View>
        </View>
      </Card>

      {/* `.profile-stats` */}
      <View style={{ flexDirection: 'row', gap: s(8), marginTop: s(10) }}>
        {SEED_PROFILE.stats.map((st) => (
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
        <FormRow label="Username">
          <Field icon="person" value={username} onChangeText={setUsername} autoComplete="username" />
        </FormRow>

        <FormRow label="Email">
          <Field
            icon="mail"
            value={email}
            onChangeText={setEmail}
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
            autoComplete="current-password"
            right={
              <Press onPress={() => setReveal(!reveal)} scale={0.9}>
                <Icon name="eye" size={s(16)} color={reveal ? C.lunaBlue : C.ink3} />
              </Press>
            }
          />
        </FormRow>
      </View>

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
        <AeroButton label="Save changes" style={{ flex: 1 }} />
        <AeroButton label="Sign out" variant="quiet" />
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
