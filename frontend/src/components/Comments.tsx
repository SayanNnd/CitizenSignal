import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Comment } from '../types';
import { CATEGORY_COLORS } from '../constants/categories';
import { timeAgo } from '../lib/format';
import { radius, spacing, white } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon } from './Icon';

export const COMMENT_MAX = 500;

const AVATAR_COLORS = Object.values(CATEGORY_COLORS);
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

interface ListProps {
  comments: Comment[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function CommentList({ comments, isLoading, isError, onRetry }: ListProps) {
  const { colors, s } = useThemed(makeStyles);

  if (isLoading) {
    return (
      <View style={s.note}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (isError) {
    return (
      <TouchableOpacity style={s.note} onPress={onRetry}>
        <Text style={s.noteText}>Couldn't load the discussion. Tap to retry.</Text>
      </TouchableOpacity>
    );
  }
  if (!comments || comments.length === 0) {
    return (
      <View style={s.note}>
        <Icon name="comment" size={24} color={colors.muted} />
        <Text style={s.noteText}>No comments yet. Start the discussion.</Text>
      </View>
    );
  }

  return (
    <View style={s.list}>
      {comments.map((c) => (
        <View key={c.id} style={s.comment}>
          <View style={[s.avatar, { backgroundColor: avatarColor(c.author) }]}>
            <Text style={s.avatarText}>{c.author.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.reply}>
            <Text style={s.metaRow} numberOfLines={1}>
              <Text style={s.author}>{c.is_mine ? 'You' : c.author}</Text>
              <Text style={s.time}>{'  '}{timeAgo(c.created_at)}</Text>
            </Text>
            <Text style={s.body}>{c.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

interface ComposerProps {
  loggedIn: boolean;
  pending: boolean;
  onLogin: () => void;
  onSubmit: (body: string) => Promise<boolean>;
  bottomInset: number;
}

/** Sticky bar at the bottom of the issue screen. Logged-out users are sent to log in first. */
export function CommentComposer({ loggedIn, pending, onLogin, onSubmit, bottomInset }: ComposerProps) {
  const { colors, s } = useThemed(makeStyles);
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !pending;

  async function send() {
    if (!canSend) return;
    const ok = await onSubmit(text.trim());
    if (ok) setText('');
  }

  const padBottom = Math.max(bottomInset, spacing.md);

  if (!loggedIn) {
    return (
      <View style={[s.composer, { paddingBottom: padBottom }]}>
        <TouchableOpacity style={s.loginBtn} onPress={onLogin} activeOpacity={0.85}>
          <Icon name="user" size={18} color={colors.surface} />
          <Text style={s.loginText}>Log in to join the discussion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.composer, { paddingBottom: padBottom }]}>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Add a comment"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={COMMENT_MAX}
        />
      </View>
      <TouchableOpacity
        style={[s.send, !canSend && { backgroundColor: colors.surfaceAlt }]}
        onPress={send}
        disabled={!canSend}
        accessibilityLabel="Post comment"
        activeOpacity={0.85}
      >
        {pending ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Icon name="send" size={20} color={canSend ? colors.onAccent : colors.muted} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    note: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
    noteText: { ...type.body, textAlign: 'center' },
    comment: {
      flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line,
    },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: white, fontWeight: '800', fontSize: 15 },
    reply: { flex: 1 },
    metaRow: { marginBottom: 2 },
    author: { fontSize: 15, fontWeight: '800', color: colors.ink },
    time: { fontSize: 14, color: colors.muted },
    body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
    composer: {
      flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg,
      paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line,
    },
    inputWrap: {
      flex: 1, backgroundColor: colors.bg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line,
      paddingHorizontal: spacing.md, minHeight: 46, maxHeight: 120, justifyContent: 'center',
    },
    input: { fontSize: 15, color: colors.ink, paddingVertical: spacing.sm },
    send: { width: 46, height: 46, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    loginBtn: {
      flex: 1, flexDirection: 'row', gap: spacing.sm, height: 48, borderRadius: radius.md,
      backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
    },
    loginText: { color: colors.surface, fontWeight: '800', fontSize: 14 },
  });
