import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useReportIssue } from '@/hooks/useIssues';
import { CategoryChip } from '@/components/CategoryChip';
import { DuplicateSheet } from '@/components/DuplicateSheet';
import { CATEGORIES } from '@/constants/categories';
import type { Category, Candidate } from '@/types';

export default function ReportScreen() {
  const router = useRouter();
  const { mutate: report, isPending } = useReportIssue();

  const [category, setCategory] = useState<Category>('pothole');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') { setLocationError(true); return; }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then((loc) =>
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
      );
    });
  }, []);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission denied', 'Photo library access is needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    // Resize with expo-image-manipulator before upload
    const resized = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
    setPhotoUri(resized.uri);
  }

  function buildFormData(overrides: Record<string, string> = {}): FormData {
    const fd = new FormData();
    fd.append('category', category);
    fd.append('description', description);
    fd.append('latitude', String(coords?.latitude ?? 0));
    fd.append('longitude', String(coords?.longitude ?? 0));
    if (photoUri) {
      fd.append('photo', { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    }
    for (const [k, v] of Object.entries(overrides)) fd.append(k, v);
    return fd;
  }

  function submit(overrides: Record<string, string> = {}) {
    if (!coords) { Alert.alert('Location unavailable', 'Wait for GPS or try again.'); return; }
    if (!photoUri && !overrides.confirm_issue_id && overrides.force_new !== 'true') {
      Alert.alert('Photo required', 'Please attach a photo of the issue.'); return;
    }
    if (description.length < 10) { Alert.alert('Description too short', 'Please write at least 10 characters.'); return; }

    const fd = buildFormData(overrides);
    report(fd, {
      onSuccess: (res) => {
        if (res.outcome === 'needs_confirmation') {
          setCandidates(res.candidates ?? []);
          setPendingFormData(fd);
          return;
        }
        const msg = res.outcome === 'reopened'
          ? '🔄 Issue reopened — it came back!'
          : res.outcome === 'merged'
          ? '✅ Your evidence was added to an existing issue.'
          : '✅ New issue created!';
        Alert.alert('Done', msg);
        router.replace('/(tabs)');
      },
      onError: (err: any) => {
        const details = err?.data?.error?.details;
        if (details?.length) {
          Alert.alert('Validation error', details.map((d: any) => d.message).join('\n'));
        } else {
          Alert.alert('Error', err.message ?? 'Something went wrong.');
        }
      },
    });
  }

  const canSubmit = !isPending && description.length >= 10 && !!photoUri;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {CATEGORIES.map((c) => (
            <CategoryChip key={c} category={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Describe the issue (10–280 characters)…"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={280}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/280</Text>

        <Text style={styles.sectionLabel}>Photo</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoBtnText}>📷  Tap to attach a photo</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Location</Text>
        {coords ? (
          <Text style={styles.locationText}>
            📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </Text>
        ) : locationError ? (
          <Text style={styles.locationError}>⚠️ GPS unavailable — location required</Text>
        ) : (
          <View style={styles.locationRow}>
            <ActivityIndicator size="small" color="#e53935" />
            <Text style={styles.locationWaiting}>  Getting your location…</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={() => submit()}
          disabled={!canSubmit}
        >
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Report</Text>}
        </TouchableOpacity>
      </ScrollView>

      <DuplicateSheet
        visible={candidates.length > 0}
        candidates={candidates}
        onConfirm={(id) => { setCandidates([]); submit({ confirm_issue_id: id }); }}
        onForceNew={() => { setCandidates([]); submit({ force_new: 'true' }); }}
        onDismiss={() => setCandidates([])}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 8 },
  chips: { marginBottom: 4 },
  textInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12,
    fontSize: 14, backgroundColor: '#fff', minHeight: 100,
  },
  charCount: { fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 4 },
  photoBtn: {
    borderWidth: 1.5, borderColor: '#ddd', borderStyle: 'dashed',
    borderRadius: 10, padding: 24, alignItems: 'center', backgroundColor: '#fff',
  },
  photoBtnText: { color: '#888', fontSize: 14 },
  photoPreview: { width: '100%', height: 200, borderRadius: 8 },
  locationText: { fontSize: 13, color: '#555' },
  locationError: { fontSize: 13, color: '#e53935' },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationWaiting: { fontSize: 13, color: '#888' },
  submitBtn: {
    backgroundColor: '#e53935', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 28,
  },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

