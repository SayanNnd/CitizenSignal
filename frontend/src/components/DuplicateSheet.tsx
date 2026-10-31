import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import type { Candidate } from '../types';
import { CATEGORY_LABELS } from '../constants/categories';

interface Props {
  visible: boolean;
  candidates: Candidate[];
  onConfirm: (issueId: string) => void;
  onForceNew: () => void;
  onDismiss: () => void;
}

export function DuplicateSheet({ visible, candidates, onConfirm, onForceNew, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Is this the same issue?</Text>
          <Text style={styles.subtitle}>We found similar reports nearby. Tap one to add your evidence to it.</Text>
          <ScrollView style={styles.list}>
            {candidates.map((c) => (
              <TouchableOpacity key={c.id} style={styles.candidate} onPress={() => onConfirm(c.id)}>
                <Text style={styles.candidateTitle}>{c.title}</Text>
                <Text style={styles.candidateMeta}>
                  {CATEGORY_LABELS[c.category]} · {Math.round(c.distance_m)}m away ·{' '}
                  {Math.round(c.text_score * 100)}% match · {c.status}
                </Text>
                {c.recurrence_count > 0 && (
                  <Text style={styles.recurrence}>🔄 Has recurred {c.recurrence_count}× before</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.newBtn} onPress={onForceNew}>
            <Text style={styles.newBtnText}>No, this is a different issue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 16 },
  list: { maxHeight: 300 },
  candidate: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  candidateTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  candidateMeta: { fontSize: 12, color: '#888' },
  recurrence: { fontSize: 12, color: '#e53935', marginTop: 4 },
  newBtn: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  newBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
  cancelBtn: { alignItems: 'center', marginTop: 12, padding: 8 },
  cancelBtnText: { fontSize: 14, color: '#888' },
});

