/**
 * Login — first screen in the auth stack (ADR 2 + ADR 4).
 */

import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Grad, AeroButton, Field, Press } from '@/components/aero/primitives';
import { Icon } from '@/components/aero/icon';
import { C, F, G, R, SH, s, textShadow } from '@/constants/aero';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { session, ready, signIn, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && session) return <Redirect href="/(tabs)" />;

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const { error: msg } = await signIn(email, password);
    setBusy(false);
    if (msg) setError(msg);
  };

  return (
    <Grad g={G.app} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + s(36),
            paddingBottom: insets.bottom + s(24),
            paddingHorizontal: s(22),
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled">
          <Text
            style={{
              fontFamily: F.black,
              fontSize: s(34),
              color: '#fff',
              ...textShadow(0.35, 8),
            }}>
            Luna
          </Text>
          <Text
            style={{
              fontFamily: F.bold,
              fontSize: s(13),
              color: 'rgba(255,255,255,.82)',
              marginTop: s(4),
              marginBottom: s(28),
            }}>
            Sign in to sync playlists, favorites, and listening history.
          </Text>

          <View
            style={{
              borderRadius: R.lg,
              backgroundColor: 'rgba(255,255,255,.78)',
              borderWidth: 1,
              borderColor: C.hairline,
              padding: s(16),
              gap: s(12),
              ...SH.card,
            }}>
            {!configured || !isSupabaseConfigured() ? (
              <Text style={{ fontFamily: F.bold, fontSize: s(11), color: C.ink2, lineHeight: s(16) }}>
                Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and
                EXPO_PUBLIC_SUPABASE_ANON_KEY, then run the SQL migration in
                supabase/migrations/.
              </Text>
            ) : null}

            <View>
              <Label>Email</Label>
              <Field
                icon="mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                editable={!busy}
              />
            </View>

            <View>
              <Label>Password</Label>
              <Field
                icon="lock"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!reveal}
                autoComplete="password"
                placeholder="••••••••"
                editable={!busy}
                right={
                  <Press onPress={() => setReveal(!reveal)} scale={0.9}>
                    <Icon name="eye" size={s(16)} color={reveal ? C.lunaBlue : C.ink3} />
                  </Press>
                }
              />
            </View>

            {error ? (
              <Text style={{ fontFamily: F.bold, fontSize: s(11), color: '#b42318' }}>{error}</Text>
            ) : null}

            <AeroButton
              label={busy ? 'Signing in…' : 'Sign in'}
              onPress={busy ? undefined : () => void onSubmit()}
              style={{ marginTop: s(4) }}
            />

            {busy ? <ActivityIndicator color={C.lunaBlue} /> : null}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: s(18), gap: s(6) }}>
            <Text style={{ fontFamily: F.bold, fontSize: s(12), color: 'rgba(255,255,255,.85)' }}>
              New here?
            </Text>
            <Link href="/(auth)/register" asChild>
              <Press>
                <Text
                  style={{
                    fontFamily: F.extrabold,
                    fontSize: s(12),
                    color: '#fff',
                    textDecorationLine: 'underline',
                  }}>
                  Create an account
                </Text>
              </Press>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Grad>
  );
}

function Label({ children }: { children: string }) {
  return (
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
      {children}
    </Text>
  );
}
