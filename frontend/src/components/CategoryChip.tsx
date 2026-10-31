import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { Category } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants/categories';

interface Props {
  category: Category;
  selected: boolean;
  onPress: () => void;
}

export function CategoryChip({ category, selected, onPress }: Props) {
  const color = CATEGORY_COLORS[category];
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: color, backgroundColor: selected ? color : 'transparent' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, { color: selected ? '#fff' : color }]}>
        {CATEGORY_LABELS[category]}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  label: { fontSize: 13, fontWeight: '600' },
});

