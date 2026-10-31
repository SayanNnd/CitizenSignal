import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { Issue } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants/categories';
import { timeAgo } from '../lib/format';
import { radius, spacing, white } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PriorityMeter } from './PriorityMeter';

interface Props {
  issue: Issue;
  onPress: () => void;
  highlighted?: boolean;
  distanceLabel?: string;
  /** Small line above the post, e.g. "You reported this" in Your Issues. */
  badge?: string;
}

/** Full-width feed row in the style of an X post: avatar, header, text, media, action counts. */
export function IssueCard({ issue, onPress, highlighted, distanceLabel, badge }: Props) {
  const { colors, s } = useThemed(makeStyles);
  const tint = CATEGORY_COLORS[issue.category];

  return (
    <TouchableOpacity
      style={[s.post, highlighted && { backgroundColor: colors.accentSoft }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.avatar, { backgroundColor: tint }]}>
        <Icon name={issue.category} size={22} color={white} />
      </View>

      <View style={s.body}>
        {badge ? <Text style={s.badge}>{badge}</Text> : null}
        <View style={s.header}>
          <Text style={s.category} numberOfLines={1}>{CATEGORY_LABELS[issue.category]}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {'  '}{timeAgo(issue.created_at)}{distanceLabel ? `  ·  ${distanceLabel}` : ''}
          </Text>
        </View>

        <Text style={s.text} numberOfLines={4}>{issue.description}</Text>

        {issue.image_url ? <Image source={{ uri: issue.image_url }} style={s.media} /> : null}

        <View style={s.actions}>
          {issue.comment_count !== undefined && <Stat icon="comment" value={issue.comment_count} />}
          <Stat icon="arrow-up" value={issue.upvotes} active={issue.has_upvoted} />
          <Stat icon="camera" value={issue.evidence_count} />
          <View style={s.meter}>
            <PriorityMeter priority={issue.priority} />
          </View>
        </View>
      </View>
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
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1 },
    badge: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 2 },
    header: { flexDirection: 'row', alignItems: 'center' },
    category: { fontSize: 15, fontWeight: '800', color: colors.ink, flexShrink: 0 },
    meta: { flex: 1, fontSize: 14, color: colors.muted },
    text: { fontSize: 15, color: colors.ink, lineHeight: 21, marginTop: 2 },
    media: {
      width: '100%', height: 190, borderRadius: radius.lg, marginTop: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginTop: spacing.sm },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statText: { ...type.mono, fontSize: 13 },
    meter: { marginLeft: 'auto' },
  });
