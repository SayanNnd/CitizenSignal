import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Icon, type IconName } from './Icon';
import { SignalMark } from './SignalMark';
import { radius, spacing } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';

const makeStyles = ({ colors, type }: ThemeValues) => ({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm } as const,
  tile: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  } as const,
  title: { ...type.heading, textAlign: 'center' } as const,
  text: { ...type.body, textAlign: 'center' } as const,
  retry: {
    marginTop: spacing.sm, backgroundColor: colors.ink, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  } as const,
  retryText: { color: colors.surface, fontWeight: '800' } as const,
});

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors, s } = useThemed(makeStyles);
  return (
    <View style={s.wrap}>
      <SignalMark size={56} />
      <ActivityIndicator color={colors.accent} />
      <Text style={s.text}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'pin', title, hint }: { icon?: IconName; title: string; hint?: string }) {
  const { colors, s } = useThemed(makeStyles);
  return (
    <View style={s.wrap}>
      <View style={s.tile}>
        <Icon name={icon} size={28} color={colors.inkSoft} />
      </View>
      <Text style={s.title}>{title}</Text>
      {hint ? <Text style={s.text}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorState({
  message = 'Something went wrong.', onRetry, actionLabel = 'Try again',
}: { message?: string; onRetry?: () => void; actionLabel?: string }) {
  const { colors, s } = useThemed(makeStyles);
  return (
    <View style={s.wrap}>
      <View style={[s.tile, { backgroundColor: colors.accentSoft }]}>
        <Icon name="alert" size={28} color={colors.accent} />
      </View>
      <Text style={s.title}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={s.retry} onPress={onRetry} activeOpacity={0.8}>
          <Text style={s.retryText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
