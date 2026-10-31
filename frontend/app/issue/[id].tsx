import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, KeyboardAvoidingView, type ScrollViewInstance,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAddComment, useComments, useIssue, useUpvote } from '@/hooks/useIssues';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { CommentComposer, CommentList } from '@/components/Comments';
import { Icon } from '@/components/Icon';
import { PriorityMeter } from '@/components/PriorityMeter';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/constants/categories';
import { caseNo, fmtDate, timeAgo } from '@/lib/format';
import { radius, shadow, spacing } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, s } = useThemed(makeStyles);
  const { user } = useAuth();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const { data, isLoading, isError, refetch } = useIssue(id);
  const { add, remove } = useUpvote();
  const comments = useComments(id);
  const addComment = useAddComment(id);

  if (isLoading) return <LoadingState label="Loading issue…" />;
  if (isError || !data) return <ErrorState message="Couldn't load this issue." onRetry={() => refetch()} />;

  const { issue, evidence } = data;
  const tint = CATEGORY_COLORS[issue.category];
  const resolved = issue.status === 'resolved';
  const statusColor = resolved ? colors.success : colors.accent;
  const busy = add.isPending || remove.isPending;

  function handleUpvote() {
    if (!user) { router.push('/login'); return; }
    if (issue.has_upvoted) {
      remove.mutate(id, { onError: () => Alert.alert('Error', 'Could not remove upvote.') });
    } else {
      add.mutate(id, { onError: () => Alert.alert('Error', 'Could not upvote.') });
    }
  }

  async function postComment(body: string) {
    try {
      await addComment.mutateAsync(body);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
      return true;
    } catch {
      Alert.alert('Error', 'Could not post your comment. Try again.');
      return false;
    }
  }

  const events = [
    { key: 'created', label: 'Reported', date: issue.created_at, color: colors.muted },
    ...(issue.resolved_at ? [{ key: 'resolved', label: 'Marked resolved', date: issue.resolved_at, color: colors.success }] : []),
    ...(issue.reopened_at ? [{ key: 'reopened', label: 'Reopened, it came back', date: issue.reopened_at, color: colors.accent }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {issue.image_url ? (
          <Image source={{ uri: issue.image_url }} style={s.hero} />
        ) : (
          <View style={[s.hero, s.heroFallback, { backgroundColor: tint + '22' }]}>
            {[200, 140, 84].map((d, i) => (
              <View
                key={d}
                style={{
                  position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: 2,
                  borderColor: tint, opacity: 0.18 + i * 0.14,
                }}
              />
            ))}
            <Icon name={issue.category} size={52} color={tint} />
          </View>
        )}

        <View style={s.body}>
          <View style={s.ticketRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.category, { color: tint }]}>{CATEGORY_LABELS[issue.category].toUpperCase()}</Text>
              <Text style={s.caseNo}>CASE {caseNo(issue.id)}</Text>
            </View>
            <View style={[s.stamp, { borderColor: statusColor }]}>
              <Text style={[s.stampText, { color: statusColor }]}>{resolved ? 'RESOLVED' : 'OPEN'}</Text>
            </View>
          </View>

          <Text style={s.title}>{issue.title}</Text>
          {issue.recurrence_count > 0 && (
            <View style={s.returned}>
              <Text style={s.returnedText}>Came back {issue.recurrence_count} time{issue.recurrence_count === 1 ? '' : 's'} after being fixed</Text>
            </View>
          )}
          <Text style={s.description}>{issue.description}</Text>

          <View style={s.stats}>
            <View style={s.stat}>
              <Text style={s.statValue}>{issue.upvotes}</Text>
              <Text style={s.statLabel}>UPVOTES</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statValue}>{issue.evidence_count}</Text>
              <Text style={s.statLabel}>REPORTS</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statValue}>{resolved ? '-' : `${Math.floor(issue.days_open)}d`}</Text>
              <Text style={s.statLabel}>OPEN FOR</Text>
            </View>
            <View style={s.stat}>
              <PriorityMeter priority={issue.priority} resolved={resolved} />
              <Text style={s.statLabel}>PRIORITY</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.upvote, issue.has_upvoted && s.upvoted]}
            onPress={handleUpvote}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Icon name={issue.has_upvoted ? 'check' : 'arrow-up'} size={18} color={issue.has_upvoted ? colors.ink : colors.onAccent} />
            <Text style={[s.upvoteText, issue.has_upvoted && { color: colors.ink }]}>
              {issue.has_upvoted ? 'UPVOTED, TAP TO UNDO' : user ? 'UPVOTE THIS ISSUE' : 'LOG IN TO UPVOTE'}
            </Text>
          </TouchableOpacity>

          <Text style={s.label}>TIMELINE</Text>
          <View style={s.timeline}>
            {events.map((e, i) => (
              <View key={e.key} style={s.eventRow}>
                <View style={s.rail}>
                  <View style={[s.eventDot, { backgroundColor: e.color }]} />
                  {i < events.length - 1 && <View style={s.eventLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < events.length - 1 ? spacing.lg : 0 }}>
                  <Text style={s.eventLabel}>{e.label}</Text>
                  <Text style={s.eventDate}>{fmtDate(e.date)}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={s.label}>EVIDENCE ({evidence.length})</Text>
          {evidence.length === 0 ? (
            <Text style={s.empty}>No extra reports yet. Reporting the same problem here adds your photo as evidence.</Text>
          ) : (
            evidence.map((e) => (
              <View key={e.id} style={s.evidence}>
                {e.image_url ? <Image source={{ uri: e.image_url }} style={s.evidenceImg} /> : (
                  <View style={[s.evidenceImg, s.evidenceFallback]}>
                    <Icon name="camera" size={20} color={colors.muted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.evidenceText}>{e.description}</Text>
                  <Text style={s.eventDate}>{timeAgo(e.created_at)}</Text>
                </View>
              </View>
            ))
          )}

          <Text style={s.label}>DISCUSSION ({comments.data?.length ?? issue.comment_count ?? 0})</Text>
          <CommentList
            comments={comments.data}
            isLoading={comments.isLoading}
            isError={comments.isError}
            onRetry={() => comments.refetch()}
          />
        </View>
      </ScrollView>

      <CommentComposer
        loggedIn={!!user}
        pending={addComment.isPending}
        onLogin={() => router.push('/login')}
        onSubmit={postComment}
        bottomInset={insets.bottom}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    content: { paddingBottom: spacing.xl },
    hero: { width: '100%', height: 230 },
    heroFallback: { alignItems: 'center', justifyContent: 'center' },
    body: {
      padding: spacing.lg, marginTop: -radius.xl, backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    },
    ticketRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
    category: { fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
    caseNo: { ...type.mono, marginTop: 2 },
    stamp: {
      borderWidth: 2.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, transform: [{ rotate: '-4deg' }],
    },
    stampText: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    title: { ...type.display, fontSize: 25, marginBottom: spacing.sm },
    returned: {
      alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: radius.sm,
      paddingHorizontal: spacing.sm, paddingVertical: 3, marginBottom: spacing.sm,
    },
    returnedText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
    description: { ...type.body, fontSize: 15, lineHeight: 23 },
    stats: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xl },
    stat: {
      flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line,
      height: 66, alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    statValue: { fontFamily: type.mono.fontFamily, fontSize: 20, fontWeight: '800', color: colors.ink },
    statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: colors.muted },
    upvote: {
      flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.accent, borderRadius: 18, height: 56,
      alignItems: 'center', justifyContent: 'center', ...shadow.float,
    },
    upvoted: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, shadowOpacity: 0, elevation: 0 },
    upvoteText: { color: colors.onAccent, fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
    label: { ...type.label, marginTop: spacing.xl, marginBottom: spacing.md },
    timeline: {
      backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, padding: spacing.lg,
    },
    eventRow: { flexDirection: 'row', gap: spacing.md },
    rail: { alignItems: 'center', width: 14 },
    eventDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
    eventLine: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 4 },
    eventLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
    eventDate: type.mono,
    empty: type.body,
    evidence: {
      flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md,
      borderWidth: 1.5, borderColor: colors.line, padding: spacing.md, marginBottom: spacing.sm,
    },
    evidenceImg: { width: 60, height: 60, borderRadius: radius.sm },
    evidenceFallback: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    evidenceText: { fontSize: 14, color: colors.ink, marginBottom: 2 },
  });
