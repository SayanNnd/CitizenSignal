import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Issue } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS, STATUS_COLORS } from '../constants/categories';

interface Props {
  issue: Issue;
  onPress: () => void;
}

export function IssueCard({ issue, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={[styles.categoryChip, { backgroundColor: CATEGORY_COLORS[issue.category] }]}>
          <Text style={styles.categoryText}>{CATEGORY_LABELS[issue.category]}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[issue.status] }]}>
          <Text style={styles.statusText}>{issue.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>{issue.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{issue.description}</Text>
      <View style={styles.footer}>
        <Text style={styles.meta}>▲ {issue.upvotes}</Text>
        <Text style={styles.meta}>📷 {issue.evidence_count}</Text>
        {issue.recurrence_count > 0 && (
          <Text style={styles.recurrence}>🔄 {issue.recurrence_count}x recurrence</Text>
        )}
        <Text style={styles.priority}>⚡ {issue.priority.toFixed(1)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  categoryChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statusChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  description: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 8 },
  footer: { flexDirection: 'row', gap: 12 },
  meta: { fontSize: 12, color: '#888' },
  recurrence: { fontSize: 12, color: '#e53935', fontWeight: '600' },
  priority: { fontSize: 12, color: '#fb8c00', fontWeight: '600', marginLeft: 'auto' },
});

