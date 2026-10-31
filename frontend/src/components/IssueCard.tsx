import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { Issue } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants/categories';
import { caseNo } from '../lib/format';
import { radius, spacing } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { PriorityMeter } from './PriorityMeter';

interface Props {
  issue: Issue;
  onPress: () => void;
  highlighted?: boolean;
  distanceLabel?: string;
}

/** Ticket-style card: colour rail on the left, case number in mono, signal bars for priority. */
export function IssueCard({ issue, onPress, highlighted, distanceLabel }: Props) {
  const { colors, s } = useThemed(makeStyles);
  const tint = CATEGORY_COLORS[issue.category];
  const resolved = issue.status === 'resolved';
  const statusColor = resolved ? colors.success : colors.accent;

  return (
    <TouchableOpacity
      style={[s.card, highlighted && { borderColor: colors.accent }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[s.rail, { backgroundColor: resolved ? colors.success : tint }]} />
      <View style={s.inner}>
        {issue.image_url ? (
          <Image source={{ uri: issue.image_url }} style={s.thumb} />
        ) : (
          <View style={[s.thumb, s.thumbFallback, { backgroundColor: tint + '1F' }]}>
            <Icon name={issue.category} size={30} color={tint} />
          </View>
        )}

        <View style={s.body}>
          <View style={s.topRow}>
            <Text style={[s.category, { color: tint }]} numberOfLines={1}>
              {CATEGORY_LABELS[issue.category].toUpperCase()}
              <Text style={s.caseNo}>{'  '}{caseNo(issue.id)}</Text>
            </Text>
            <View style={[s.status, { borderColor: statusColor }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[s.statusText, { color: statusColor }]}>{resolved ? 'RESOLVED' : 'OPEN'}</Text>
            </View>
          </View>

          <Text style={s.title} numberOfLines={1}>{issue.title}</Text>
          <Text style={s.description} numberOfLines={2}>{issue.description}</Text>

          <View style={s.footer}>
            <View style={s.stat}>
              <Icon name="arrow-up" size={13} color={colors.muted} />
              <Text style={s.statText}>{issue.upvotes}</Text>
            </View>
            <View style={s.stat}>
              <Icon name="camera" size={14} color={colors.muted} />
              <Text style={s.statText}>{issue.evidence_count}</Text>
            </View>
            {issue.comment_count !== undefined && (
              <View style={s.stat}>
                <Icon name="comment" size={14} color={colors.muted} />
                <Text style={s.statText}>{issue.comment_count}</Text>
              </View>
            )}
            {distanceLabel ? <Text style={s.statText}>{distanceLabel}</Text> : null}
            {issue.recurrence_count > 0 && <Text style={s.recurrence}>Returned {issue.recurrence_count}x</Text>}
            <View style={s.meter}>
              <PriorityMeter priority={issue.priority} resolved={resolved} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.xs + 1,
      borderWidth: 1.5,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    rail: { width: 6 },
    inner: { flex: 1, flexDirection: 'row', padding: spacing.md, gap: spacing.md },
    thumb: { width: 76, height: 76, borderRadius: radius.md },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    category: { flex: 1, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
    caseNo: { ...type.mono, fontSize: 10.5 },
    status: {
      flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6,
      paddingHorizontal: 6, paddingVertical: 1,
    },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
    title: { fontSize: 15, fontWeight: '800', color: colors.ink, marginTop: 3 },
    description: { fontSize: 13, color: colors.inkSoft, lineHeight: 18, marginTop: 1 },
    footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statText: { ...type.mono, fontWeight: '700' },
    recurrence: { fontSize: 11, fontWeight: '800', color: colors.accent },
    meter: { marginLeft: 'auto' },
  });
