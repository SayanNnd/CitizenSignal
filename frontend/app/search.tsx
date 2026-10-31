import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import { radius, spacing } from '@/constants/theme';
import { CATEGORY_LABELS } from '@/constants/categories';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

/** Bold section title that folds its rows away (the "LOCATIONS ▾ / ISSUES ▾" dropdowns from the mock). */
function SectionHeader({ title, count, open, onToggle }: { title: string; count?: number; open: boolean; onToggle: () => void }) {
  const { colors, s } = useThemed(makeStyles);
  return (
    <Pressable
      style={({ pressed }) => [s.sectionHeader, pressed && { backgroundColor: colors.surfaceAlt }]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
    >
      <Text style={s.sectionTitle}>{title}</Text>
      {count !== undefined && <Text style={s.sectionCount}>{count}</Text>}
      <View style={{ marginLeft: 'auto' }}>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function PlaceRow({ icon, label, hint, onPress }: { icon: IconName; label: string; hint?: string; onPress: () => void }) {
  const { colors, s } = useThemed(makeStyles);
  return (
    <Pressable style={({ pressed }) => [s.placeRow, pressed && { backgroundColor: colors.surfaceAlt }]} onPress={onPress}>
      <View style={s.placeIcon}>
        <Icon name={icon} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.placeLabel} numberOfLines={1}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
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

  const { data, isPending: isLoading, isError, refetch } = useIssues(
    loc.ready ? loc.center.latitude : null,
    loc.ready ? loc.center.longitude : null,
    loc.radius,
  );

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
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" hitSlop={10} style={s.back}>
          <Icon name="chevron-left" size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={s.input}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            style={s.inputText}
            value={query}
            onChangeText={setQuery}
            placeholder="Search a place or an issue"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
              <Icon name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <SectionHeader title="Locations" open={locOpen} onToggle={() => setLocOpen((o) => !o)} />
        {locOpen && (
          <View>
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
              <Text style={s.note}>No places found for "{query.trim()}".</Text>
            )}
            {!showRecent && places.map((p) => (
              <PlaceRow key={`${p.latitude},${p.longitude}`} icon="pin" label={p.label} onPress={() => pickPlace(p)} />
            ))}
          </View>
        )}

        <SectionHeader
          title="Issues"
          count={isLoading ? undefined : matchingIssues.length}
          open={issuesOpen}
          onToggle={() => setIssuesOpen((o) => !o)}
        />
        {issuesOpen && (
          isLoading ? (
            <LoadingState label="Loading issues…" />
          ) : isError ? (
            <ErrorState message="Couldn't load issues." onRetry={refetch} />
          ) : matchingIssues.length === 0 ? (
            <Text style={s.note}>{q ? `No issues match "${query.trim()}".` : `No issues near ${loc.center.label} yet.`}</Text>
          ) : (
            matchingIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                distanceLabel={distanceLabel(issue.latitude, issue.longitude)}
                onPress={() => pickIssue(issue.id)}
              />
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line,
    },
    back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    input: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 40, borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md,
    },
    inputText: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 0 },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line,
    },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.ink },
    sectionCount: { fontSize: 15, color: colors.muted, fontWeight: '600' },
    placeRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line,
    },
    placeIcon: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    },
    placeLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
    hint: { ...type.caption, fontSize: 13 },
    note: { ...type.body, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
    inline: { padding: spacing.md },
  });
