import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { Issue } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants/categories';
import { displayTitle, recurrenceLabel, timeAgo } from '../lib/format';
import { radius, spacing } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { SeverityTriangle } from './SeverityTriangle';

interface Props {
  issue: Issue;
  onPress: () => void;
  highlighted?: boolean;
  distanceLabel?: string;
  /** Small line above the post, e.g. "You reported this" in Your Issues. */
  badge?: string;
  /** Extra controls under the counts, e.g. the admin close / reopen button. */
  footer?: React.ReactNode;
}

/** Full-width feed row (X-style layout): category line, headline, short description, photo, counts. */
export function IssueCard({ issue, onPress, highlighted, distanceLabel, badge, footer }: Props) {
  const { colors, s } = useThemed(makeStyles);
  const tint = CATEGORY_COLORS[issue.category];
  const label = CATEGORY_LABELS[issue.category];
  const recurring = recurrenceLabel(issue.recurrence_count);

  return (
    <TouchableOpacity
      style={[s.post, highlighted && { backgroundColor: colors.accentSoft }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {badge ? <Text style={s.badge}>{badge}</Text> : null}

      <View style={s.metaRow}>
        <Icon name={issue.category} size={15} color={tint} />
        <Text style={[s.category, { color: tint }]}>{label}</Text>
        <Text style={s.meta} numberOfLines={1}>
          {'·  '}{timeAgo(issue.created_at)}{distanceLabel ? `  ·  ${distanceLabel}` : ''}
        </Text>
        <SeverityTriangle priority={issue.priority} />
      </View>

      {recurring ? (
        <View style={s.recurring}>
          <Icon name="alert" size={13} color={colors.accent} />
          <Text style={s.recurringText}>{recurring}</Text>
        </View>
      ) : null}

      <Text style={s.title} numberOfLines={2}>{displayTitle(issue.title, label)}</Text>
      <Text style={s.description} numberOfLines={2}>{issue.description}</Text>

      {issue.image_url ? <Image source={{ uri: issue.image_url }} style={s.media} /> : null}

      <View style={s.actions}>
        <Stat icon="comment" value={issue.comment_count} />
        <Stat icon="arrow-up" value={issue.upvotes} active={issue.has_upvoted} />
        <Stat icon="camera" value={issue.evidence_count} />
      </View>

      {footer}
    </TouchableOpacity>
  );
}

function Stat({ icon, value, active }: { icon: IconName; value: number; active?: boolean }) {
  const { colors, s } = useThemed(makeStyles);
  const color = active ? colors.accent : colors.muted;
  return (
    <View style={s.stat}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[s.statText, { color }]}>{value}</Text>
    </View>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    post: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    badge: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: spacing.xs },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    category: { fontSize: 13, fontWeight: '800' },
    meta: { flex: 1, fontSize: 13, color: colors.muted },
    recurring: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
    recurringText: { fontSize: 12, fontWeight: '800', color: colors.accent },
    title: { fontSize: 17, fontWeight: '800', color: colors.ink, lineHeight: 23, marginTop: spacing.xs },
    description: { fontSize: 14, color: colors.inkSoft, lineHeight: 20, marginTop: 2 },
    media: {
      width: '100%', height: 190, borderRadius: radius.lg, marginTop: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginTop: spacing.sm },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statText: { ...type.mono, fontSize: 13 },
  });
