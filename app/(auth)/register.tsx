/**
 * Register — Supabase Auth sign-up (ADR 4).
 *
 * Shares its frame with login.tsx via components/auth-shell.tsx.
 */

import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AeroButton, Field, Press } from '@/components/aero/primitives';
import { Icon } from '@/components/aero/icon';
import { AuthFooterLink, AuthFooterText, AuthLabel, AuthShell } from '@/components/auth-shell';
import { C, F, s } from '@/constants/aero';
import { useAuth } from '@/providers/auth';

export default function RegisterScreen() {
  const { session, ready, signUp, configured } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (ready && session) return <Redirect href="/(tabs)" />;

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    const { error: msg } = await signUp(email, password, displayName || undefined);
    setBusy(false);
    if (msg) {
      setError(msg);
      return;
    }
    setInfo('Account created. If email confirmation is enabled in Supabase, check your inbox.');
  };

  return (
    <AuthShell
      title="Join Luna"
      subtitle="Your library lives on your account — not just this phone."
      footer={
        <>
          <AuthFooterText>Already have an account?</AuthFooterText>
          <Link href="/(auth)/login" asChild>
            <Press>
              <AuthFooterLink>Sign in</AuthFooterLink>
            </Press>
          </Link>
        </>
      }>
      {!configured ? (
        <Text style={{ fontFamily: F.bold, fontSize: s(11), color: C.ink2, lineHeight: s(16) }}>
          Configure Supabase env vars before creating an account.
        </Text>
      ) : null}

      <View>
        <AuthLabel>Display name</AuthLabel>
        <Field
          icon="person"
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
          placeholder="Alex Rivera"
          editable={!busy}
        />
      </View>

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
          autoComplete="new-password"
          placeholder="At least 6 characters"
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
      {info ? (
        <Text style={{ fontFamily: F.bold, fontSize: s(11), color: C.ink2 }}>{info}</Text>
      ) : null}

      <AeroButton
        label={busy ? 'Creating…' : 'Create account'}
        variant="green"
        onPress={busy ? undefined : () => void onSubmit()}
        style={{ marginTop: s(4) }}
      />

      {busy ? <ActivityIndicator color={C.lunaBlue} /> : null}
    </AuthShell>
  );
}
