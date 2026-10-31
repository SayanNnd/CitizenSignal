import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView,
  type TextInputInstance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { SignalMark } from '@/components/SignalMark';
import { radius, spacing } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

const MIN_PASSWORD = 6;

/** Cheap shape check so obvious typos are caught before a round trip; the server validates properly. */
function validate(email: string, password: string): string | null {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address.';
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  return null;
}

export default function LoginScreen() {
  const router = useRouter();
  const { colors, s } = useThemed(makeStyles);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  async function handleSubmit() {
    const invalid = validate(email, password);
    if (invalid) { setError(invalid); return; }
    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.back(); // the screen underneath (e.g. an issue) finishes what the user started
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.logo}><SignalMark size={80} /></View>
        <Text style={s.title}>Join CitizenSignal</Text>
        <Text style={s.subtitle}>Log in to upvote issues, comment and track your reports.</Text>

        <Text style={s.label}>EMAIL</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={(t) => { setEmail(t); setError(null); }}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading}
        />

        <Text style={s.label}>PASSWORD</Text>
        <View style={s.passwordRow}>
          <TextInput
            ref={passwordRef}
            style={[s.input, s.passwordInput]}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            placeholderTextColor={colors.muted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            editable={!loading}
          />
          <TouchableOpacity style={s.show} onPress={() => setShowPassword((v) => !v)} accessibilityRole="button">
            <Text style={s.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={s.btnText}>Continue</Text>}
        </TouchableOpacity>
        <Text style={s.hint}>New here? We'll create your account with this email and password.</Text>

        <TouchableOpacity style={s.later} onPress={() => router.back()} disabled={loading}>
          <Text style={s.laterText}>Not now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
    logo: { alignSelf: 'center', marginBottom: spacing.lg },
    title: { ...type.display, textAlign: 'center' },
    subtitle: { ...type.body, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
    label: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.md },
    input: {
      height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md, fontSize: 15, color: colors.ink,
    },
    passwordRow: { justifyContent: 'center' },
    passwordInput: { paddingRight: 64 },
    show: { position: 'absolute', right: 0, height: 50, paddingHorizontal: spacing.md, justifyContent: 'center' },
    showText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
    error: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: spacing.md },
    btn: {
      height: 52, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
      marginTop: spacing.xl,
    },
    btnText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
    hint: { ...type.body, fontSize: 13, textAlign: 'center', marginTop: spacing.md },
    later: { alignItems: 'center', padding: spacing.lg, marginTop: spacing.xs },
    laterText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  });
