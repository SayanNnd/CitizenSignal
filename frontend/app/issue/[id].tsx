import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, KeyboardAvoidingView, RefreshControl,
  type ScrollViewInstance,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAddComment, useComments, useIssue, useSetIssueStatus, useUpvote } from '@/hooks/useIssues';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { CommentComposer, CommentList } from '@/components/Comments';
import { AdminStatusButton } from '@/components/AdminStatusButton';
import { Icon } from '@/components/Icon';
import { SeverityTriangle } from '@/components/SeverityTriangle';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/constants/categories';
import { displayTitle, fmtDate, recurrenceLabel } from '@/lib/format';
import { radius, spacing, white } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

interface TimelineEvent {
  key: string;
  kind: 'report' | 'fixed' | 'reopened';
  label: string;
  date: string;
  text?: string;
  image?: string | null;
}

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, s } = useThemed(makeStyles);
  const { user, isAdmin } = useAuth();
  const setStatus = useSetIssueStatus();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const { data, isLoading, isError, refetch } = useIssue(id);
  const { add, remove } = useUpvote();
  const comments = useComments(id);
  const addComment = useAddComment(id);
  // Reloads the issue, its timeline and the comments.
  const pull = usePullToRefresh(() => Promise.all([refetch(), comments.refetch()]));

  // Upvote tapped while logged out: remember it, send the user to /login, finish it on return.
  const pendingUpvote = useRef(false);
  const issueLoaded = data?.issue;
  useEffect(() => {
    if (!user || !pendingUpvote.current || !issueLoaded) return;
    pendingUpvote.current = false;
    if (!issueLoaded.has_upvoted) {
      add.mutate(id, { onError: () => Alert.alert('Error', 'Could not upvote.') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, issueLoaded]);

  if (isLoading) return <LoadingState label="Loading issue…" />;
  if (isError || !data) return <ErrorState message="Couldn't load this issue." onRetry={() => refetch()} />;

  const { issue, evidence } = data;
  const tint = CATEGORY_COLORS[issue.category];
  const busy = add.isPending || remove.isPending;
  const commentCount = comments.data?.length ?? issue.comment_count;
  const recurring = recurrenceLabel(issue.recurrence_count);

  function handleUpvote() {
    if (!user) { pendingUpvote.current = true; router.push('/login'); return; }
    if (issue.has_upvoted) {
      remove.mutate(id, { onError: () => Alert.alert('Error', 'Could not remove upvote.') });
    } else {
      add.mutate(id, { onError: () => Alert.alert('Error', 'Could not upvote.') });
    }
  }

  function toggleStatus() {
    setStatus.mutate(
      { id, status: issue.status === 'resolved' ? 'open' : 'resolved' },
      { onError: (e) => Alert.alert('Error', e.message || 'Could not update the issue.') },
    );
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

  // Every report (the first one plus each one merged in as evidence), the fix date and the date it
  // came back, oldest first. The API only keeps the most recent fix and reopen dates, so earlier
  // rounds of a recurring issue can't be listed.
  const events: TimelineEvent[] = [
    { key: 'created', kind: 'report' as const, label: 'Reported', date: issue.created_at },
    ...evidence.map((e) => ({
      key: e.id, kind: 'report' as const, label: 'Reported again', date: e.created_at, text: e.description, image: e.image_url,
    })),
    ...(issue.resolved_at ? [{ key: 'fixed', kind: 'fixed' as const, label: 'Fixed', date: issue.resolved_at }] : []),
    ...(issue.reopened_at ? [{ key: 'reopened', kind: 'reopened' as const, label: 'Came back', date: issue.reopened_at }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={pull.refreshing}
            onRefresh={pull.onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {issue.image_url ? (
          <Image source={{ uri: issue.image_url }} style={s.hero} />
        ) : (
          <View style={[s.hero, s.heroFallback, { backgroundColor: tint + '22' }]}>
            {[220, 150, 90].map((d, i) => (
              <View
                key={d}
                style={{
                  position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: 2,
                  borderColor: tint, opacity: 0.16 + i * 0.14,
                }}
              />
            ))}
            <Icon name={issue.category} size={60} color={tint} />
          </View>
        )}

        <View style={s.post}>
          <View style={s.metaRow}>
            <Icon name={issue.category} size={16} color={tint} />
            <Text style={[s.category, { color: tint }]}>{CATEGORY_LABELS[issue.category]}</Text>
            <Text style={s.when} numberOfLines={1}>{'·  '}{fmtDate(issue.created_at)}</Text>
            <SeverityTriangle priority={issue.priority} size={15} withLabel />
          </View>

          {recurring ? (
            <View style={s.recurring}>
              <Icon name="alert" size={15} color={colors.accent} />
              <Text style={s.recurringText}>{recurring}</Text>
            </View>
          ) : null}

          <Text style={s.title}>{displayTitle(issue.title, CATEGORY_LABELS[issue.category])}</Text>
          <Text style={s.description}>{issue.description}</Text>
        </View>

        <View style={s.statsLine}>
          <Text style={s.statText}><Text style={s.statNum}>{issue.upvotes}</Text> Upvotes</Text>
          <Text style={s.statText}><Text style={s.statNum}>{issue.evidence_count}</Text> Reports</Text>
          <Text style={s.statText}><Text style={s.statNum}>{commentCount}</Text> Comments</Text>
        </View>

        <View style={s.actionBar}>
          <TouchableOpacity
            style={[s.upvote, issue.has_upvoted && s.upvoted]}
            onPress={handleUpvote}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Icon name={issue.has_upvoted ? 'check' : 'arrow-up'} size={18} color={issue.has_upvoted ? colors.ink : colors.onAccent} />
            <Text style={[s.upvoteText, issue.has_upvoted && { color: colors.ink }]}>
              {issue.has_upvoted ? 'Upvoted' : user ? 'Upvote' : 'Log in to upvote'}
            </Text>
          </TouchableOpacity>
          {isAdmin && <AdminStatusButton status={issue.status} pending={setStatus.isPending} onPress={toggleStatus} />}
        </View>

        <Text style={s.label}>Timeline</Text>
        <View style={s.timeline}>
          {events.map((e, i) => {
            const fixed = e.kind === 'fixed';
            const last = i === events.length - 1;
            return (
              <View key={e.key} style={s.eventRow}>
                <View style={s.rail}>
                  <View style={[s.eventDot, { backgroundColor: fixed ? colors.success : colors.accent }]}>
                    <Icon name={fixed ? 'check' : e.kind === 'reopened' ? 'alert' : 'camera'} size={12} color={white} />
                  </View>
                  {!last && <View style={s.eventLine} />}
                </View>
                <View style={[s.eventBody, !last && { paddingBottom: spacing.lg }]}>
                  <View style={s.eventHead}>
                    <Text style={[s.eventLabel, fixed && { color: colors.success }]}>{e.label}</Text>
                    <Text style={s.eventDate}>{fmtDate(e.date)}</Text>
                  </View>
                  {e.text ? <Text style={s.eventText}>{e.text}</Text> : null}
                  {e.image ? <Image source={{ uri: e.image }} style={s.eventImg} /> : null}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={s.label}>Comments</Text>
        <CommentList
          comments={comments.data}
          isLoading={comments.isLoading}
          isError={comments.isError}
          onRetry={() => comments.refetch()}
        />
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
    hero: { width: '100%', height: 300 },
    heroFallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    post: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    category: { fontSize: 14, fontWeight: '800' },
    when: { flex: 1, fontSize: 14, color: colors.muted },
    recurring: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    recurringText: { fontSize: 14, fontWeight: '800', color: colors.accent },
    title: { ...type.display, fontSize: 27, lineHeight: 33, marginTop: spacing.sm },
    description: { fontSize: 15, lineHeight: 22, color: colors.inkSoft, marginTop: spacing.sm },
    statsLine: {
      flexDirection: 'row', gap: spacing.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    },
    statText: { fontSize: 14, color: colors.muted },
    statNum: { fontWeight: '800', color: colors.ink },
    actionBar: {
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line,
    },
    upvote: {
      flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.accent, borderRadius: radius.md, height: 46,
      alignItems: 'center', justifyContent: 'center',
    },
    upvoted: { backgroundColor: colors.surfaceAlt },
    upvoteText: { color: colors.onAccent, fontSize: 15, fontWeight: '800' },
    label: { ...type.heading, fontSize: 17, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
    timeline: { paddingHorizontal: spacing.lg },
    eventRow: { flexDirection: 'row', gap: spacing.md },
    rail: { alignItems: 'center', width: 24 },
    eventDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    eventLine: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 2 },
    eventBody: { flex: 1 },
    eventHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, minHeight: 24 },
    eventLabel: { fontSize: 15, fontWeight: '800', color: colors.ink },
    eventDate: { fontSize: 13, color: colors.muted },
    eventText: { fontSize: 14, color: colors.inkSoft, lineHeight: 20, marginTop: 2 },
    eventImg: { width: '100%', height: 150, borderRadius: radius.lg, marginTop: spacing.sm },
  });
