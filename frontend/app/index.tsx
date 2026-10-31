import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIssues } from '@/hooks/useIssues';
import { useAuth } from '@/auth/AuthProvider';
import { useLocationContext } from '@/location/LocationProvider';
import { IssueSheet, type IssueFilter, type Snap } from '@/components/IssueSheet';
import { MenuDrawer, type MenuItem } from '@/components/MenuDrawer';
import { RoundButton } from '@/components/RoundButton';
import { CompassButton } from '@/components/CompassButton';
import { Icon } from '@/components/Icon';
import { CATEGORY_COLORS } from '@/constants/categories';
import { DARK_MAP_STYLE } from '@/constants/mapStyle';
import { radius, shadow, spacing, white } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

function deltaFor(radiusM: number) {
  return Math.max(0.01, (radiusM * 2.6) / 111_000);
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, s } = useThemed(makeStyles);
  const { user, signOut } = useAuth();
  const loc = useLocationContext();
  const { center, radius: radiusM, focusedIssueId, setFocusedIssueId } = loc;

  const mapRef = useRef<MapView>(null);
  const [snap, setSnap] = useState<Snap>('half');
  const [sheetH, setSheetH] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heading, setHeading] = useState(0);
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [trackMarkers, setTrackMarkers] = useState(true);

  const { data, isLoading, isError, refetch } = useIssues(center.latitude, center.longitude, radiusM);
  const all = useMemo(() => data ?? [], [data]);

  const issues = useMemo(
    () =>
      all.filter((i) =>
        filter === 'all' ? true
        : filter === 'open' ? i.status === 'open'
        : filter === 'resolved' ? i.status === 'resolved'
        : i.recurrence_count > 0,
      ),
    [all, filter],
  );

  const counts = useMemo<Record<IssueFilter, number>>(
    () => ({
      all: all.length,
      open: all.filter((i) => i.status === 'open').length,
      resolved: all.filter((i) => i.status === 'resolved').length,
      recurring: all.filter((i) => i.recurrence_count > 0).length,
    }),
    [all],
  );

  // Custom markers only need to re-render briefly when their content changes.
  useEffect(() => {
    setTrackMarkers(true);
    const t = setTimeout(() => setTrackMarkers(false), 800);
    return () => clearTimeout(t);
  }, [issues.length, focusedIssueId, isDark, filter]);

  // Fly to a newly selected locality and show its issues.
  useEffect(() => {
    const d = deltaFor(radiusM);
    mapRef.current?.animateToRegion(
      // shift the camera so the centre sits above the sheet, not under it
      { latitude: center.latitude - d * 0.18, longitude: center.longitude, latitudeDelta: d, longitudeDelta: d },
      600,
    );
    if (!loc.isCurrent) setSnap('half');
  }, [center.latitude, center.longitude, radiusM, loc.isCurrent]);

  // An issue picked from search (or tapped on the map) gets zoomed to and listed.
  useEffect(() => {
    if (!focusedIssueId) return;
    const issue = all.find((i) => i.id === focusedIssueId);
    if (!issue) return;
    setFilter('all');
    mapRef.current?.animateToRegion(
      { latitude: issue.latitude - 0.0012, longitude: issue.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 },
      500,
    );
    setSnap((cur) => (cur === 'collapsed' ? 'half' : cur));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIssueId, data]);

  const onVisibleHeight = useCallback((h: number) => setSheetH(h), []);

  function syncHeading() {
    mapRef.current?.getCamera().then((c) => setHeading(c.heading ?? 0)).catch(() => {});
  }

  function faceNorth() {
    mapRef.current?.animateCamera({ heading: 0 }, { duration: 300 });
  }

  function requireLogin(go: () => void) {
    if (!user) router.push('/login');
    else go();
  }

  const menuItems: MenuItem[] = [
    { key: 'mine', icon: 'list', label: 'Your Issues', onPress: () => requireLogin(() => router.push('/my-issues')) },
    { key: 'settings', icon: 'sliders', label: 'Settings', onPress: () => router.push('/settings') },
    { key: 'help', icon: 'help', label: 'Help', onPress: () => router.push('/help') },
    user
      ? {
          key: 'logout', icon: 'logout', label: 'Logout', destructive: true,
          onPress: () => signOut().catch(() => Alert.alert('Error', 'Could not log out.')),
        }
      : { key: 'login', icon: 'user', label: 'Log in', onPress: () => router.push('/login') },
  ];

  const floatingBottom = sheetH + spacing.md;

  return (
    <View style={s.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
        initialRegion={{
          latitude: center.latitude, longitude: center.longitude,
          latitudeDelta: deltaFor(radiusM), longitudeDelta: deltaFor(radiusM),
        }}
        showsUserLocation={!!loc.userCoords}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onRegionChangeComplete={syncHeading}
        onPress={() => snap === 'full' && setSnap('half')}
      >
        <Circle
          center={center}
          radius={radiusM}
          strokeColor={colors.accent + 'AA'}
          fillColor={colors.accent + '12'}
          strokeWidth={2}
        />
        {!loc.isCurrent && <Marker coordinate={center} pinColor={colors.ink} title={center.label} />}
        {issues.map((issue) => {
          const selected = issue.id === focusedIssueId;
          const resolved = issue.status === 'resolved';
          const tint = CATEGORY_COLORS[issue.category];
          return (
            <Marker
              key={issue.id}
              coordinate={{ latitude: issue.latitude, longitude: issue.longitude }}
              tracksViewChanges={trackMarkers}
              zIndex={selected ? 10 : 1}
              onPress={() => {
                setFocusedIssueId(issue.id);
                setSnap('half');
              }}
            >
              <View style={s.pinBox}>
                <View
                  style={[
                    s.pin,
                    resolved
                      ? { backgroundColor: colors.surface, borderColor: colors.success }
                      : { backgroundColor: tint, borderColor: white },
                    selected && s.pinSelected,
                  ]}
                >
                  <Icon name={issue.category} size={selected ? 22 : 19} color={resolved ? colors.success : white} />
                </View>
                {issue.recurrence_count > 0 && <View style={s.pinBadge} />}
              </View>
            </Marker>
          );
        })}
      </MapView>

      <RoundButton
        icon="menu"
        label="Open menu"
        onPress={() => setMenuOpen(true)}
        style={{ position: 'absolute', top: insets.top + spacing.md, left: spacing.lg }}
      />

      {loc.permissionDenied && (
        <TouchableOpacity
          style={[s.notice, { top: insets.top + spacing.md }]}
          onPress={() => loc.useMyLocation()}
          activeOpacity={0.85}
        >
          <Icon name="locate" size={18} color={colors.surface} />
          <Text style={s.noticeText}>Location is off. Tap to enable</Text>
        </TouchableOpacity>
      )}

      {snap !== 'full' && (
        <View style={[s.sideButtons, { bottom: floatingBottom }]}>
          <CompassButton heading={heading} onPress={faceNorth} />
          <RoundButton
            icon="locate"
            label="Go to my location"
            onPress={() => loc.useMyLocation()}
            active={loc.isCurrent && !!loc.userCoords}
          />
        </View>
      )}

      <IssueSheet
        snap={snap}
        onSnapChange={setSnap}
        issues={issues}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        address={center.label}
        radiusLabel={radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}
        focusedId={focusedIssueId}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        onOpenSearch={() => router.push('/search')}
        onOpenIssue={(id) => router.push(`/issue/${id}`)}
        onVisibleHeight={onVisibleHeight}
      />

      {snap !== 'collapsed' && (
        <TouchableOpacity
          style={[s.newPost, { bottom: insets.bottom + spacing.lg }]}
          onPress={() => router.push('/report')}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="New post"
        >
          <Icon name="plus" size={20} color={colors.onAccent} />
          <Text style={s.newPostText}>NEW POST</Text>
        </TouchableOpacity>
      )}

      <MenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} items={menuItems} email={user?.email} />
    </View>
  );
}

const makeStyles = ({ colors }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    sideButtons: { position: 'absolute', right: spacing.lg, gap: spacing.md },
    notice: {
      position: 'absolute', left: 80, right: spacing.lg, height: 48, borderRadius: radius.pill,
      backgroundColor: colors.ink, flexDirection: 'row', gap: spacing.sm, alignItems: 'center',
      justifyContent: 'center', ...shadow.float,
    },
    noticeText: { color: colors.surface, fontWeight: '700', fontSize: 13 },
    pinBox: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
    pin: {
      width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, ...shadow.card,
    },
    pinSelected: { width: 46, height: 46, borderRadius: 23, borderColor: colors.ink },
    pinBadge: {
      position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7,
      backgroundColor: colors.ink, borderWidth: 2.5, borderColor: white,
    },
    newPost: {
      position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.accent, borderRadius: 18, paddingHorizontal: spacing.xl, height: 56,
      ...shadow.float,
    },
    newPostText: { color: colors.onAccent, fontSize: 15, fontWeight: '900', letterSpacing: 1.4 },
  });
