import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { SignalMark } from '@/components/SignalMark';
import { radius, shadow, spacing } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, s } = useThemed(makeStyles);
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { Alert.alert('Required', 'Enter email and password.'); return; }
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setLoading(false);
    if (error) { Alert.alert('Error', error); return; }
    router.back();
  }

  const signin = mode === 'signin';

  return (
    <KeyboardAvoidingView style={s.container} behavior="padding">
      <View style={s.logo}><SignalMark size={72} /></View>
      <Text style={s.title}>{signin ? 'Welcome back' : 'Join CitizenSignal'}</Text>
      <Text style={s.subtitle}>
        {signin ? 'Log in to upvote issues, comment and track your reports.' : 'Create an account to upvote, comment and follow issues.'}
      </Text>

      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={s.input}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.submitText}>{signin ? 'LOG IN' : 'SIGN UP'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode(signin ? 'signup' : 'signin')}>
        <Text style={s.toggle}>{signin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
    logo: { alignSelf: 'center', marginBottom: spacing.lg },
    title: { ...type.display, textAlign: 'center' },
    subtitle: { ...type.body, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xxl },
    input: {
      borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg,
      fontSize: 15, color: colors.ink, backgroundColor: colors.surface, marginBottom: spacing.md,
    },
    submitBtn: {
      backgroundColor: colors.accent, borderRadius: 18, height: 56, alignItems: 'center',
      justifyContent: 'center', marginTop: spacing.sm, marginBottom: spacing.lg, ...shadow.float,
    },
    submitText: { color: colors.onAccent, fontSize: 15, fontWeight: '900', letterSpacing: 1.4 },
    toggle: { color: colors.accent, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  });
