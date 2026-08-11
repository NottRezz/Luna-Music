/**
 * Login — first screen in the auth stack (ADR 2 + ADR 4).
 *
 * The frame, brand lockup and panel come from components/auth-shell.tsx, which
 * register.tsx also uses. Keep layout changes there so the two cannot drift.
 */

import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AeroButton, Field, Press } from '@/components/aero/primitives';
import { Icon } from '@/components/aero/icon';
import { AuthFooterLink, AuthFooterText, AuthLabel, AuthShell } from '@/components/auth-shell';
import { C, F, s } from '@/constants/aero';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

export default function LoginScreen() {
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
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to sync your playlists, favorites and listening history."
      footer={
        <>
          <AuthFooterText>New here?</AuthFooterText>
          <Link href="/(auth)/register" asChild>
            <Press>
              <AuthFooterLink>Create an account</AuthFooterLink>
            </Press>
          </Link>
        </>
      }>
      {!configured || !isSupabaseConfigured() ? (
        <Text style={{ fontFamily: F.bold, fontSize: s(11), color: C.ink2, lineHeight: s(16) }}>
          Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and
          EXPO_PUBLIC_SUPABASE_ANON_KEY, then run the SQL migration in
          supabase/migrations/.
        </Text>
      ) : null}

      <View>
        <AuthLabel>Email</AuthLabel>
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
        <AuthLabel>Password</AuthLabel>
        <Field
          icon="lock"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!reveal}
          autoComplete="password"
          placeholder="••••••••"
          editable={!busy}
          onSubmitEditing={() => void onSubmit()}
          returnKeyType="go"
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
    </AuthShell>
  );
}
