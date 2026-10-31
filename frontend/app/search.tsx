import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIssues } from '@/hooks/useIssues';
import { labelFor, useLocationContext, type Place } from '@/location/LocationProvider';
import { IssueCard } from '@/components/IssueCard';
import { Icon, type IconName } from '@/components/Icon';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { formatDistance } from '@/lib/format';
import { radius, shadow, spacing } from '@/constants/theme';
import { CATEGORY_LABELS } from '@/constants/categories';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

function Section({
  title, count, open, onToggle, children,
}: { title: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors, s } = useThemed(makeStyles);
  return (
    <View style={s.section}>
      <TouchableOpacity style={s.sectionHeader} onPress={onToggle} activeOpacity={0.8} accessibilityRole="button">
        <Text style={s.sectionTitle}>{title}</Text>
        {count !== undefined && <Text style={s.sectionCount}>{count}</Text>}
        <View style={{ marginLeft: 'auto' }}>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} />
        </View>
      </TouchableOpacity>
      {open && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
}

function PlaceRow({ icon, label, hint, onPress }: { icon: IconName; label: string; hint?: string; onPress: () => void }) {
  const { colors, s } = useThemed(makeStyles);
  return (
    <TouchableOpacity style={s.placeRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.placeIcon}>
        <Icon name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.placeLabel} numberOfLines={1}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, s } = useThemed(makeStyles);
  const loc = useLocationContext();

  const [query, setQuery] = useState('');
  const [locOpen, setLocOpen] = useState(true);
  const [issuesOpen, setIssuesOpen] = useState(true);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState(false);

  const { data, isLoading, isError, refetch } = useIssues(loc.center.latitude, loc.center.longitude, loc.radius);

  const q = query.trim().toLowerCase();
  const matchingIssues = useMemo(
    () =>
      (data ?? []).filter(
        (i) =>
          !q ||
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          CATEGORY_LABELS[i.category].toLowerCase().includes(q),
      ),
    [data, q],
  );

  // Debounced locality lookup (device geocoder).
  useEffect(() => {
    if (q.length < 3) {
      setPlaces([]);
      setPlacesError(false);
      setPlacesLoading(false);
      return;
    }
    let cancelled = false;
    setPlacesLoading(true);
    const t = setTimeout(async () => {
      try {
        const results = (await Location.geocodeAsync(query.trim())).slice(0, 4);
        const labelled = await Promise.all(
          results.map(async (r) => ({ latitude: r.latitude, longitude: r.longitude, label: await labelFor(r) })),
        );
        if (cancelled) return;
        setPlaces(labelled);
        setPlacesError(false);
      } catch {
        if (!cancelled) {
          setPlaces([]);
          setPlacesError(true);
        }
      } finally {
        if (!cancelled) setPlacesLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, query]);

  function pickPlace(place: Place) {
    loc.selectPlace(place);
    router.back();
  }

  function pickIssue(id: string) {
    loc.setFocusedIssueId(id);
    router.back();
  }

  const distanceLabel = (lat: number, lng: number) =>
    formatDistance(getDistance(loc.center, { latitude: lat, longitude: lng }));

  const showRecent = q.length < 3;

  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior="padding">
      <View style={s.topBar}>
        <TouchableOpacity style={s.back} onPress={() => router.back()} accessibilityLabel="Close search">
          <Icon name="close" size={18} color={colors.ink} />
        </TouchableOpacity>
        <View>
          <Text style={s.topTitle}>Search</Text>
          <Text style={s.topSub} numberOfLines={1}>Near {loc.center.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Section title="LOCATIONS" open={locOpen} onToggle={() => setLocOpen((o) => !o)}>
          <PlaceRow
            icon="locate"
            label="My current location"
            hint={loc.permissionDenied ? 'Location permission is off' : undefined}
            onPress={async () => {
              await loc.useMyLocation();
              router.back();
            }}
          />
          {showRecent &&
            loc.recent.map((p) => (
              <PlaceRow key={p.label} icon="clock" label={p.label} hint="Recent" onPress={() => pickPlace(p)} />
            ))}
          {placesLoading && <ActivityIndicator style={s.inline} color={colors.accent} />}
          {!showRecent && !placesLoading && placesError && (
            <Text style={s.note}>Couldn't search places right now. Check your connection.</Text>
          )}
          {!showRecent && !placesLoading && !placesError && places.length === 0 && (
            <Text style={s.note}>No locations found for "{query.trim()}".</Text>
          )}
          {!showRecent && places.map((p) => (
            <PlaceRow key={`${p.latitude},${p.longitude}`} icon="pin" label={p.label} onPress={() => pickPlace(p)} />
          ))}
        </Section>

        <Section
          title="ISSUES"
          count={isLoading ? undefined : matchingIssues.length}
          open={issuesOpen}
          onToggle={() => setIssuesOpen((o) => !o)}
        >
          {isLoading ? (
            <LoadingState label="Loading issues…" />
          ) : isError ? (
            <ErrorState message="Couldn't load issues." onRetry={refetch} />
          ) : matchingIssues.length === 0 ? (
            <Text style={s.note}>{q ? `No issues match "${query.trim()}".` : 'No issues in this area yet.'}</Text>
          ) : (
            matchingIssues.map((issue) => (
              <View key={issue.id} style={s.issueWrap}>
                <IssueCard
                  issue={issue}
                  distanceLabel={distanceLabel(issue.latitude, issue.longitude)}
                  onPress={() => pickIssue(issue.id)}
                />
              </View>
            ))
          )}
        </Section>
      </ScrollView>

      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={s.input}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            style={s.inputText}
            value={query}
            onChangeText={setQuery}
            placeholder="Search a locality or an issue"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search" style={s.clear}>
              <Icon name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
    back: {
      width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1.5,
      borderColor: colors.line, alignItems: 'center', justifyContent: 'center', ...shadow.card,
    },
    topTitle: type.title,
    topSub: { ...type.caption, maxWidth: 240 },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
    section: {
      backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden',
      borderWidth: 1.5, borderColor: colors.line,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
    sectionTitle: { ...type.label, fontSize: 12, color: colors.ink },
    sectionCount: {
      ...type.mono, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: 7,
      paddingVertical: 1, overflow: 'hidden', fontWeight: '700',
    },
    sectionBody: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: spacing.xs, backgroundColor: colors.bg },
    placeRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md, backgroundColor: colors.surface,
    },
    placeIcon: {
      width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.accentSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    placeLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
    hint: type.caption,
    note: { ...type.body, padding: spacing.lg },
    inline: { padding: spacing.md },
    issueWrap: {},
    inputBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg },
    input: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 52, borderRadius: radius.md,
      backgroundColor: colors.surface, paddingHorizontal: spacing.lg, borderWidth: 1.5, borderColor: colors.line,
    },
    inputText: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 0 },
    clear: { padding: spacing.xs },
  });
