import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { Status } from '../types';
import { radius, spacing } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon } from './Icon';

interface Props {
  status: Status;
  pending: boolean;
  onPress: () => void;
}

/** Admin-only toggle: "Mark as fixed" on an open issue, "Reopen issue" on a fixed one. */
export function AdminStatusButton({ status, pending, onPress }: Props) {
  const { colors, s } = useThemed(makeStyles);
  const fixed = status === 'resolved';
  const fg = fixed ? colors.accent : colors.success;

  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: fixed ? colors.accentSoft : colors.successSoft }, pending && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={pending}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      {pending ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Icon name={fixed ? 'alert' : 'check'} size={16} color={fg} />
          <Text style={[s.text, { color: fg }]}>{fixed ? 'Reopen issue' : 'Mark as fixed'}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (_: ThemeValues) =>
  StyleSheet.create({
    btn: {
      flexDirection: 'row', gap: spacing.sm, height: 42, borderRadius: radius.md, marginTop: spacing.md,
      alignItems: 'center', justifyContent: 'center',
    },
    text: { fontSize: 14, fontWeight: '800' },
  });
