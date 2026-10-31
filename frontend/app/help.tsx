import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

const TOPICS = [
  { q: 'How do I report a problem?', a: 'Tap New Post, pick a category, describe the problem, add a photo and adjust the pin. Browsing and reporting work without an account.' },
  { q: 'What is "Is this the same issue?"', a: 'If someone already reported something similar within a few metres, we ask you to confirm. Saying yes adds your photo as evidence instead of creating a duplicate.' },
  { q: 'What does "Returned" mean?', a: 'The issue was marked resolved, then reported again. Recurring problems rank higher so they get fixed properly.' },
  { q: 'What do upvotes and comments do?', a: "One upvote per person per issue. Upvotes, evidence, recurrence and age all raise an issue's priority, shown as signal bars. Log in to upvote or join the discussion." },
  { q: 'How do I look at another area?', a: 'Tap the search bar, type a locality, and pick it. The map and issue list switch to that area. Pick an issue from the results to jump straight to it on the map.' },
  { q: 'What do the map markers mean?', a: 'Filled markers are open issues, coloured by category. Hollow green markers are resolved. A dark dot means the issue has come back before.' },
];

export default function HelpScreen() {
  const { s } = useThemed(makeStyles);
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {TOPICS.map((t, i) => (
        <View key={t.q} style={s.card}>
          <Text style={s.num}>{String(i + 1).padStart(2, '0')}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.q}>{t.q}</Text>
            <Text style={s.a}>{t.a}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md },
    card: {
      flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg,
      padding: spacing.lg, borderWidth: 1.5, borderColor: colors.line,
    },
    num: { ...type.mono, fontSize: 18, fontWeight: '800', color: colors.accent, width: 30 },
    q: type.heading,
    a: { ...type.body, marginTop: spacing.xs },
  });
