import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { Category } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants/categories';
import { radius, spacing, white } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon } from './Icon';

interface Props {
  category: Category;
  selected: boolean;
  onPress: () => void;
}

export function CategoryChip({ category, selected, onPress }: Props) {
  const { colors, s } = useThemed(makeStyles);
  const color = CATEGORY_COLORS[category];
  return (
    <TouchableOpacity
      style={[s.chip, selected && { backgroundColor: color, borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name={category} size={18} color={selected ? white : color} />
      <Text style={[s.label, { color: selected ? white : colors.ink }]}>{CATEGORY_LABELS[category]}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = ({ colors }: ThemeValues) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 1,
      marginRight: spacing.sm,
    },
    label: { fontSize: 13, fontWeight: '700' },
  });
