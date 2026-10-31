import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useReportIssue } from '@/hooks/useIssues';
import { useLocationContext, type Coords } from '@/location/LocationProvider';
import { CategoryChip } from '@/components/CategoryChip';
import { DuplicateSheet } from '@/components/DuplicateSheet';
import { Icon } from '@/components/Icon';
import { CATEGORIES } from '@/constants/categories';
import { DARK_MAP_STYLE } from '@/constants/mapStyle';
import { radius, shadow, spacing, white } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';
import type { Category, Candidate } from '@/types';

export default function ReportScreen() {
  const router = useRouter();
  const { colors, isDark, s } = useThemed(makeStyles);
  const { userCoords, center, isCurrent } = useLocationContext();
  const { mutate: report, isPending } = useReportIssue();

  const [category, setCategory] = useState<Category>('pothole');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords>(userCoords ?? center);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  // The server rejects a blank location (400), so never submit the fallback map centre unconfirmed:
  // we need a GPS fix, a searched locality, or the user placing the pin themselves.
  const [located, setLocated] = useState(!!userCoords || !isCurrent);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Follow the GPS fix if it arrives after the screen opened.
  useEffect(() => {
    if (userCoords) {
      setCoords(userCoords);
      setLocated(true);
    }
  }, [userCoords]);

  async function shrink(uri: string) {
    const resized = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    setPhotoUri(resized.uri);
    setPhotoError(null);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission denied', 'Photo library access is needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) await shrink(result.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission denied', 'Camera access is needed.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) await shrink(result.assets[0].uri);
  }

  function buildFormData(overrides: Record<string, string> = {}): FormData {
    const fd = new FormData();
    fd.append('category', category);
    fd.append('description', description);
    fd.append('latitude', String(coords.latitude));
    fd.append('longitude', String(coords.longitude));
    if (photoUri) {
      fd.append('photo', { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    }
    for (const [k, v] of Object.entries(overrides)) fd.append(k, v);
    return fd;
  }

  function submit(overrides: Record<string, string> = {}) {
    if (!located || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      Alert.alert('Location needed', 'Allow location access, or drag the pin to where the problem is.');
      return;
    }
    if (!photoUri) { Alert.alert('Photo required', 'Please attach a photo of the issue.'); return; }
    if (description.trim().length < 10) { Alert.alert('Description too short', 'Please write at least 10 characters.'); return; }

    report(buildFormData(overrides), {
      onSuccess: (res) => {
        if (res.outcome === 'needs_confirmation') {
          setCandidates(res.candidates ?? []);
          return;
        }
        // merged and reopened read the same to users: their report joined an existing issue
        const msg = res.outcome === 'created'
          ? 'Your issue is posted.'
          : 'Someone already reported this. Your report was added to it.';
        Alert.alert('Thanks', msg);
        router.replace('/');
      },
      onError: (err: any) => {
        const details: { field: string; message: string }[] = err?.data?.error?.details ?? [];
        const photo = details.find((d) => d.field === 'photo');
        if (photo) setPhotoError(photo.message);
        const others = details.filter((d) => d.field !== 'photo');
        if (others.length) {
          Alert.alert('Validation error', others.map((d) => d.message).join('\n'));
        } else if (!photo) {
          Alert.alert('Error', err.message ?? 'Something went wrong.');
        }
      },
    });
  }

  const canSubmit = !isPending && description.trim().length >= 10 && !!photoUri && located;

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((c) => (
            <CategoryChip key={c} category={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <Text style={s.label}>What's wrong?</Text>
        <TextInput
          style={s.textInput}
          placeholder="Describe the issue (10 to 280 characters)"
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={280}
          textAlignVertical="top"
        />
        <Text style={s.charCount}>{description.length}/280</Text>

        <Text style={s.label}>Photo</Text>
        {photoUri ? (
          <View>
            <Image source={{ uri: photoUri }} style={s.photo} />
            <TouchableOpacity style={s.removePhoto} onPress={() => setPhotoUri(null)} accessibilityLabel="Remove photo">
              <Icon name="close" size={16} color={white} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.photoRow}>
            <TouchableOpacity style={s.photoBtn} onPress={takePhoto} activeOpacity={0.8}>
              <Icon name="camera" size={28} color={colors.accent} />
              <Text style={s.photoText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoBtn} onPress={pickPhoto} activeOpacity={0.8}>
              <Icon name="image" size={28} color={colors.accent} />
              <Text style={s.photoText}>From gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {photoError ? <Text style={s.error}>{photoError}</Text> : null}

        <Text style={s.label}>Location</Text>
        <View style={s.mapWrap}>
          <MapView
            style={StyleSheet.absoluteFill}
            customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
            region={{ ...coords, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
            toolbarEnabled={false}
            showsCompass={false}
          >
            <Marker
              coordinate={coords}
              draggable
              pinColor={colors.accent}
              onDragEnd={(e) => {
                setCoords(e.nativeEvent.coordinate);
                setLocated(true);
              }}
            />
          </MapView>
        </View>
        {located ? (
          <Text style={s.hint}>Hold and drag the pin to adjust the exact spot.</Text>
        ) : (
          <Text style={s.error}>No GPS fix yet. Allow location access, or drag the pin to where the problem is.</Text>
        )}

        <TouchableOpacity
          style={[s.submit, !canSubmit && s.submitDisabled]}
          onPress={() => submit()}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={[s.submitText, !canSubmit && { color: colors.muted }]}>Post report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <DuplicateSheet
        visible={candidates.length > 0}
        candidates={candidates}
        onConfirm={(id) => { setCandidates([]); submit({ confirm_issue_id: id }); }}
        onForceNew={() => { setCandidates([]); submit({ force_new: 'true' }); }}
        onDismiss={() => setCandidates([])}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: 48 },
    label: { ...type.heading, marginTop: spacing.xl, marginBottom: spacing.sm },
    textInput: {
      borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md,
      fontSize: 15, color: colors.ink, backgroundColor: colors.surface, minHeight: 110,
    },
    charCount: { ...type.mono, textAlign: 'right', marginTop: spacing.xs },
    photoRow: { flexDirection: 'row', gap: spacing.md },
    photoBtn: {
      flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl,
      borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.muted,
      backgroundColor: colors.surface,
    },
    photoText: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
    photo: { width: '100%', height: 210, borderRadius: radius.lg },
    removePhoto: {
      position: 'absolute', top: spacing.sm, right: spacing.sm, width: 34, height: 34, borderRadius: 17,
      backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center',
    },
    mapWrap: {
      height: 180, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.line, ...shadow.card,
    },
    hint: { ...type.caption, marginTop: spacing.sm },
    error: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: spacing.sm },
    submit: {
      backgroundColor: colors.accent, borderRadius: radius.md, height: 52, alignItems: 'center',
      justifyContent: 'center', marginTop: spacing.xxl, ...shadow.float,
    },
    submitDisabled: { backgroundColor: colors.surfaceAlt, shadowOpacity: 0, elevation: 0 },
    submitText: { color: colors.onAccent, fontSize: 16, fontWeight: '800' },
  });
