/**
 * The frame both auth screens sit in.
 *
 * There is no `.auth` in design/mockup/ — the mockup opens straight into the
 * tabs — so this is composed from the pieces the mockup does define, rather
 * than invented: the app bar's gradient and brand lockup (`.appbar`), its
 * rising bubbles (`.appbar .fizz`), its gloss (`.appbar::after`), and the
 * frosted panel from `.pl-hero` / `.profile-card`.
 *
 * The point is continuity. The orb and wordmark here are the same ones that
 * end up in the top-left of the app bar a second after you sign in, so the
 * login screen reads as the product rather than as a gate in front of it.
 *
 * It also exists so the two screens cannot drift: they were duplicated, and
 * the white-on-near-white contrast bug had to be fixed in both.
 */

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fizz, type BubbleSpec } from '@/components/aero-chrome';
import { Card, Grad } from '@/components/aero/primitives';
import { BrandMark } from '@/components/brand-mark';
import { C, DOWN, F, G, SCROLL, SH, s, textShadow } from '@/constants/aero';

/**
 * Bigger, slower and more numerous than the app bar's four, because they are
 * crossing a whole screen rather than a 46px strip.
 */
const AUTH_BUBBLES: readonly BubbleSpec[] = [
  { size: 26, left: '8%', duration: 17000, delay: 0 },
  { size: 12, left: '23%', duration: 12000, delay: 4200 },
  { size: 38, left: '47%', duration: 21000, delay: 1800 },
  { size: 9, left: '37%', duration: 10500, delay: 9000 },
  { size: 16, left: '68%', duration: 14000, delay: 6600 },
  { size: 22, left: '87%', duration: 18500, delay: 2800 },
];

/**
 * Generous: a bubble that overshoots is already at zero opacity, so this only
 * has to be *at least* screen height in mockup units, not exactly it.
 */
const AUTH_RISE = 860;

/**
 * How the leftover vertical space is split above and below the content.
 * Equal weights would centre it; weighting the bottom heavier lifts the stack
 * off dead centre, which leaves room for the keyboard and reads better.
 * Raise `BELOW` to lift further, lower it to settle back toward the middle.
 */
const ABOVE = 4;
const BELOW = 11;

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  /** The form. Rendered inside the frosted panel. */
  children: ReactNode;
  /** The cross-link to the other auth screen. */
  footer: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Grad g={G.auth} style={{ flex: 1 }}>
      <Fizz bubbles={AUTH_BUBBLES} rise={AUTH_RISE} />

      {/* `.appbar::after` — the gloss that makes the blue look wet.
          NOT `G.glossBar`: that token bottoms out at .04 white rather than 0,
          which is invisible across a 46px bar but leaves a hard seam where it
          stops over a full screen. This one runs the whole height and fades to
          fully transparent, so there is no edge to see. */}
      <Grad
        g={{
          colors: ['rgba(255,255,255,.30)', 'rgba(255,255,255,.07)', 'rgba(255,255,255,0)'],
          locations: [0, 0.26, 0.6],
          ...DOWN,
        }}
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + s(24),
            paddingBottom: insets.bottom + s(24),
            paddingHorizontal: s(22),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...SCROLL}>
          {/* Empty spacers, so the split is purely proportional. A spacer with
              children in it grows on top of its own content height, which is
              what makes weighting them look wrong. */}
          <View style={{ flex: ABOVE }} />

          {/* The app bar's brand lockup, at rest and a size larger. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(9), marginBottom: s(22) }}>
            <BrandMark size={s(42)} style={SH.btn} />

            <View style={{ minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: F.black,
                  fontSize: s(15),
                  color: '#fff',
                  ...textShadow(0.45, 2),
                }}>
                Luna Music
              </Text>
              <Text
                style={{
                  fontFamily: F.extrabold,
                  fontSize: s(8.5),
                  letterSpacing: s(8.5) * 0.16,
                  color: 'rgba(255,255,255,.72)',
                }}>
                SPHR STUDIOS
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontFamily: F.black,
              fontSize: s(30),
              lineHeight: s(35),
              color: '#fff',
              ...textShadow(0.35, 8),
            }}>
            {title}
          </Text>
          <Text
            style={{
              fontFamily: F.bold,
              fontSize: s(12.5),
              lineHeight: s(18),
              color: 'rgba(255,255,255,.88)',
              marginTop: s(6),
              marginBottom: s(20),
              maxWidth: s(300),
              ...textShadow(0.25, 4),
            }}>
            {subtitle}
          </Text>

          {/* Opaque base with the frosted gradient painted behind the content —
              an elevated view with a translucent background composites its
              children into the same layer on Android and leaves hard seams.
              That is what `Card` is for; the previous inline panel reproduced
              the exact bug `Card` was written to avoid. */}
          <Card style={{ padding: s(16), gap: s(12) }}>{children}</Card>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: s(18),
              gap: s(6),
            }}>
            {footer}
          </View>

          <View style={{ flex: BELOW }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Grad>
  );
}

/** `.field` label — uppercase micro-heading above each input. */
export function AuthLabel({ children }: { children: string }) {
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

/** The "New here? / Already have an account?" lead-in, on the blue. */
export function AuthFooterText({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: F.bold,
        fontSize: s(12),
        color: 'rgba(255,255,255,.85)',
        ...textShadow(0.25, 3),
      }}>
      {children}
    </Text>
  );
}

/** The underlined link itself. */
export function AuthFooterLink({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: F.extrabold,
        fontSize: s(12),
        color: '#fff',
        textDecorationLine: 'underline',
        ...textShadow(0.3, 3),
      }}>
      {children}
    </Text>
  );
}
