import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { SignalMark } from '@/components/SignalMark';
import { radius, shadow, spacing } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, s } = useThemed(makeStyles);
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    const { error, cancelled } = await signInWithGoogle();
    setLoading(false);
    if (cancelled) return;
    if (error) {
      Alert.alert('Google sign-in failed', error);
      return;
    }
    router.back(); // the screen underneath (e.g. an issue) finishes what the user started
  }

  return (
    <View style={s.container}>
      <View style={s.logo}><SignalMark size={80} /></View>
      <Text style={s.title}>Join CitizenSignal</Text>
      <Text style={s.subtitle}>Log in to upvote issues, comment and track your reports.</Text>

      <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            <View style={s.gMark}><Text style={s.gText}>G</Text></View>
            <Text style={s.googleText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={s.later} onPress={() => router.back()} disabled={loading}>
        <Text style={s.laterText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
    logo: { alignSelf: 'center', marginBottom: spacing.lg },
    title: { ...type.display, textAlign: 'center' },
    subtitle: { ...type.body, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xxl },
    googleBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, height: 56,
      borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, ...shadow.card,
    },
    gMark: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' },
    gText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, includeFontPadding: false },
    googleText: { fontSize: 15, fontWeight: '800', color: colors.ink },
    later: { alignItems: 'center', padding: spacing.lg, marginTop: spacing.sm },
    laterText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  });
