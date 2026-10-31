import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIssue, useUpvote } from '@/hooks/useIssues';
import { useAuth } from '@/auth/AuthProvider';
import { CATEGORY_LABELS, CATEGORY_COLORS, STATUS_COLORS } from '@/constants/categories';

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useIssue(id);
  const { add, remove } = useUpvote();

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#e53935" /></View>;
  if (isError || !data) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Failed to load issue.</Text>
      <TouchableOpacity onPress={() => refetch()}><Text style={styles.retry}>Retry</Text></TouchableOpacity>
    </View>
  );

  const { issue } = data;

  function handleUpvote() {
    if (!user) { router.push('/login'); return; }
    if (issue.has_upvoted) {
      remove.mutate(id, { onError: () => Alert.alert('Error', 'Could not remove upvote.') });
    } else {
      add.mutate(id, { onError: () => Alert.alert('Error', 'Could not upvote.') });
    }
  }

  return (
    <ScrollView style={styles.container}>
      {issue.image_url && <Image source={{ uri: issue.image_url }} style={styles.image} />}

      <View style={styles.body}>
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: CATEGORY_COLORS[issue.category] }]}>
            <Text style={styles.chipText}>{CATEGORY_LABELS[issue.category]}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: STATUS_COLORS[issue.status] }]}>
            <Text style={styles.chipText}>{issue.status.toUpperCase()}</Text>
          </View>
          {issue.recurrence_count > 0 && (
            <View style={[styles.chip, { backgroundColor: '#e53935' }]}>
              <Text style={styles.chipText}>🔄 {issue.recurrence_count}× recurrence</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{issue.title}</Text>
        <Text style={styles.description}>{issue.description}</Text>

        <View style={styles.stats}>
          <Text style={styles.stat}>⚡ Priority: {issue.priority.toFixed(1)}</Text>
          <Text style={styles.stat}>📷 Evidence: {issue.evidence_count}</Text>
          {issue.status === 'open' && <Text style={styles.stat}>📅 Open {Math.floor(issue.days_open)}d</Text>}
        </View>

        <TouchableOpacity
          style={[styles.upvoteBtn, issue.has_upvoted && styles.upvotedBtn]}
          onPress={handleUpvote}
          disabled={add.isPending || remove.isPending}
        >
          <Text style={styles.upvoteBtnText}>
            {issue.has_upvoted ? '▼ Remove upvote' : '▲ Upvote'} · {issue.upvotes}
          </Text>
        </TouchableOpacity>

        {issue.resolved_at && (
          <Text style={styles.meta}>Resolved: {new Date(issue.resolved_at).toLocaleDateString()}</Text>
        )}
        {issue.reopened_at && (
          <Text style={styles.meta}>Reopened: {new Date(issue.reopened_at).toLocaleDateString()}</Text>
        )}
        <Text style={styles.meta}>Reported: {new Date(issue.created_at).toLocaleDateString()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  image: { width: '100%', height: 240, resizeMode: 'cover' },
  body: { padding: 16 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  chip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  description: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 16 },
  stats: { flexDirection: 'row', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  stat: { fontSize: 13, color: '#666' },
  upvoteBtn: {
    backgroundColor: '#e53935', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 16,
  },
  upvotedBtn: { backgroundColor: '#888' },
  upvoteBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorText: { color: '#e53935', marginBottom: 8 },
  retry: { color: '#e53935', textDecorationLine: 'underline' },
  meta: { fontSize: 12, color: '#aaa', marginTop: 4 },
});

