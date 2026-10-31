import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import type { Candidate } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants/categories';
import { caseNo } from '../lib/format';
import { radius, spacing } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon } from './Icon';

interface Props {
  visible: boolean;
  candidates: Candidate[];
  onConfirm: (issueId: string) => void;
  onForceNew: () => void;
  onDismiss: () => void;
}

export function DuplicateSheet({ visible, candidates, onConfirm, onForceNew, onDismiss }: Props) {
  const { colors, s } = useThemed(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Is this the same issue?</Text>
          <Text style={s.subtitle}>We found similar reports nearby. Tap one to add your evidence to it.</Text>
          <ScrollView style={s.list}>
            {candidates.map((c) => {
              const tint = CATEGORY_COLORS[c.category];
              return (
                <TouchableOpacity key={c.id} style={s.candidate} onPress={() => onConfirm(c.id)} activeOpacity={0.8}>
                  <View style={[s.tile, { backgroundColor: tint + '1F' }]}>
                    <Icon name={c.category} size={26} color={tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.candidateTitle}>{c.title}</Text>
                    <Text style={s.meta}>
                      {CATEGORY_LABELS[c.category]}  {caseNo(c.id)}  {Math.round(c.distance_m)} m  {Math.round(c.text_score * 100)}% match
                    </Text>
                    <View style={s.tagRow}>
                      <Text style={[s.tag, { color: c.status === 'resolved' ? colors.success : colors.accent }]}>
                        {c.status.toUpperCase()}
                      </Text>
                      {c.recurrence_count > 0 && <Text style={s.recurrence}>Returned {c.recurrence_count}x before</Text>}
                    </View>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.muted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={s.newBtn} onPress={onForceNew} activeOpacity={0.85}>
            <Text style={s.newBtnText}>No, this is a different issue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onDismiss}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
      padding: spacing.xl, paddingTop: spacing.md, maxHeight: '82%',
    },
    handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.lg },
    title: { ...type.title, marginBottom: spacing.xs },
    subtitle: { ...type.body, marginBottom: spacing.lg },
    list: { maxHeight: 330 },
    candidate: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderColor: colors.line,
      borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.bg,
    },
    tile: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    candidateTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, marginBottom: 2 },
    meta: { ...type.mono, fontSize: 11 },
    tagRow: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
    tag: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 },
    recurrence: { fontSize: 11, color: colors.accent, fontWeight: '800' },
    newBtn: { backgroundColor: colors.ink, borderRadius: radius.md, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
    newBtnText: { fontSize: 14, fontWeight: '800', color: colors.surface },
    cancelBtn: { alignItems: 'center', marginTop: spacing.sm, padding: spacing.sm },
    cancelBtnText: { fontSize: 14, color: colors.muted, fontWeight: '700' },
  });
