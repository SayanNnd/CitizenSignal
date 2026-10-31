import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { RADIUS_OPTIONS, useLocationContext } from '@/location/LocationProvider';
import { darkPalette, lightPalette, radius, spacing } from '@/constants/theme';
import { useThemed, type ThemeMode, type ThemeValues } from '@/theme/ThemeProvider';

const radiusLabel = (m: number) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);

/** Tiny mock of a screen in the given palette so the choice is visual, not just a word. */
function ThemePreview({ mode }: { mode: ThemeMode }) {
  const half = (p: typeof lightPalette, flex = 1) => (
    <View style={{ flex, backgroundColor: p.bg, padding: 6, gap: 4 }}>
      <View style={{ height: 8, borderRadius: 3, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line }} />
      <View style={{ height: 8, width: '60%', borderRadius: 3, backgroundColor: p.accent }} />
      <View style={{ height: 6, width: '80%', borderRadius: 3, backgroundColor: p.ink, opacity: 0.7 }} />
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', height: 54, borderRadius: radius.sm, overflow: 'hidden' }}>
      {mode === 'light' && half(lightPalette)}
      {mode === 'dark' && half(darkPalette)}
      {mode === 'system' && <>{half(lightPalette)}{half(darkPalette)}</>}
    </View>
  );
}

const MODES: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode, s } = useThemed(makeStyles);
  const { user, signOut } = useAuth();
  const { radius: current, setRadius } = useLocationContext();

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.label}>APPEARANCE</Text>
      <View style={s.card}>
        <View style={s.tiles}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[s.tile, active && { borderColor: colors.accent }]}
                onPress={() => setMode(m.key)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <ThemePreview mode={m.key} />
                <View style={s.tileFooter}>
                  <View style={[s.radio, active && { borderColor: colors.accent }]}>
                    {active && <View style={[s.radioDot, { backgroundColor: colors.accent }]} />}
                  </View>
                  <Text style={[s.tileLabel, active && { color: colors.ink }]}>{m.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.help}>System follows your phone's light or dark setting.</Text>
      </View>

      <Text style={s.label}>SEARCH RADIUS</Text>
      <View style={s.card}>
        <Text style={s.help}>How far around the selected area should we look for issues?</Text>
        <View style={s.segment}>
          {RADIUS_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.option, current === m && s.optionActive]}
              onPress={() => setRadius(m)}
              activeOpacity={0.8}
            >
              <Text style={[s.optionText, current === m && { color: colors.surface }]}>{radiusLabel(m)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={s.label}>ACCOUNT</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>{user ? user.email : 'Not logged in'}</Text>
        <Text style={s.help}>
          {user ? 'You can upvote, comment and follow your reports.' : 'Log in to upvote, comment and see your reports.'}
        </Text>
        <TouchableOpacity
          style={[s.btn, user && { backgroundColor: colors.accentSoft }]}
          onPress={() => (user ? signOut() : router.push('/login'))}
          activeOpacity={0.85}
        >
          <Text style={[s.btnText, user && { color: colors.accent }]}>{user ? 'Log out' : 'Log in'}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    label: { ...type.label, marginTop: spacing.lg, marginBottom: spacing.sm },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
      borderWidth: 1.5, borderColor: colors.line,
    },
    cardTitle: type.heading,
    help: type.body,
    tiles: { flexDirection: 'row', gap: spacing.sm },
    tile: {
      flex: 1, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, padding: spacing.sm,
      gap: spacing.sm, backgroundColor: colors.bg,
    },
    tileFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    radio: {
      width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.muted,
      alignItems: 'center', justifyContent: 'center',
    },
    radioDot: { width: 8, height: 8, borderRadius: 4 },
    tileLabel: { fontSize: 13, fontWeight: '800', color: colors.inkSoft },
    btn: { backgroundColor: colors.accent, borderRadius: radius.md, height: 48, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: colors.onAccent, fontWeight: '800', fontSize: 15 },
    segment: { flexDirection: 'row', gap: spacing.sm },
    option: {
      flex: 1, height: 42, borderRadius: radius.sm, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.line,
      alignItems: 'center', justifyContent: 'center',
    },
    optionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
    optionText: { fontFamily: type.mono.fontFamily, fontWeight: '800', color: colors.ink, fontSize: 13 },
  });
