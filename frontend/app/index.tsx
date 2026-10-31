import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SignalMark } from '@/components/SignalMark';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useIsFocused, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIssues } from '@/hooks/useIssues';
import { useAuth } from '@/auth/AuthProvider';
import { useLocationContext } from '@/location/LocationProvider';
import { IssueSheet, type Snap } from '@/components/IssueSheet';
import { MenuDrawer, type MenuItem } from '@/components/MenuDrawer';
import { RoundButton } from '@/components/RoundButton';
import { CompassButton } from '@/components/CompassButton';
import { Icon } from '@/components/Icon';
import { CATEGORY_COLORS } from '@/constants/categories';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '@/constants/mapStyle';
import { radius, shadow, spacing, white } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

function deltaFor(radiusM: number) {
  return Math.max(0.01, (radiusM * 2.6) / 111_000);
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, s } = useThemed(makeStyles);
  const { user, signOut, isAdmin } = useAuth();
  const loc = useLocationContext();
  const { center, ready, radius: radiusM, focusedIssueId, setFocusedIssueId } = loc;

  const mapRef = useRef<MapView>(null);
  const [snap, setSnap] = useState<Snap>('half');
  const [menuOpen, setMenuOpen] = useState(false);
  const [heading, setHeading] = useState(0);
  const [trackMarkers, setTrackMarkers] = useState(true);

  // useIssues asks the API for open issues only; fixed ones are not shown on the map or in the feed.
  // Nothing is requested until the location is known, so we never load the fallback city first.
  const { data, isPending, isError, refetch } = useIssues(
    ready ? center.latitude : null,
    ready ? center.longitude : null,
    radiusM,
  );
  const issues = useMemo(() => data ?? [], [data]);

  // Custom markers only need to re-render briefly when their content changes.
  useEffect(() => {
    setTrackMarkers(true);
    const t = setTimeout(() => setTrackMarkers(false), 800);
    return () => clearTimeout(t);
  }, [issues.length, focusedIssueId, isDark]);

  // Where the camera should be: the focused issue (picked in search or tapped on the map),
  // otherwise the selected area. Both are shifted down so the point sits above the sheet.
  const focusedIssue = focusedIssueId ? issues.find((i) => i.id === focusedIssueId) : undefined;
  const target = useMemo(() => {
    if (focusedIssue) {
      return { latitude: focusedIssue.latitude - 0.0012, longitude: focusedIssue.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 };
    }
    const d = deltaFor(radiusM);
    return { latitude: center.latitude - d * 0.18, longitude: center.longitude, latitudeDelta: d, longitudeDelta: d };
  }, [focusedIssue, center.latitude, center.longitude, radiusM]);

  // Picking a place or issue happens on the search screen, while this screen (and its map) is hidden;
  // a camera move sent to a hidden map is dropped. So move the camera only while this screen is
  // focused, and catch up when it comes back into view.
  const isFocused = useIsFocused();
  const flownTo = useRef('');
  const [recenterNonce, setRecenterNonce] = useState(0);
  useEffect(() => {
    if (!isFocused || !ready || !mapRef.current) return;
    const key = `${target.latitude},${target.longitude},${target.latitudeDelta},${recenterNonce}`;
    if (key === flownTo.current) return;
    const first = flownTo.current === '';
    flownTo.current = key;
    // wait for the back transition to finish before animating
    const t = setTimeout(() => mapRef.current?.animateToRegion(target, 600), first ? 0 : 350);
    return () => clearTimeout(t);
  }, [isFocused, ready, target, recenterNonce]);

  // A searched locality or a focused issue should be visible in the list, not hidden under a collapsed sheet.
  useEffect(() => {
    if (!loc.isCurrent) setSnap('half');
  }, [center.latitude, center.longitude, loc.isCurrent]);
  useEffect(() => {
    if (focusedIssue) setSnap((cur) => (cur === 'collapsed' ? 'half' : cur));
  }, [focusedIssue]);

  function goToMyLocation() {
    loc.useMyLocation();
    // the area may not change (already "here") after panning away, so force the camera back anyway
    setRecenterNonce((n) => n + 1);
  }

  // Read the camera heading while the map moves (not only when it stops) so the compass can follow.
  // One request at a time; the compass itself animates between readings.
  const headingBusy = useRef(false);
  const syncHeading = useCallback(() => {
    if (headingBusy.current || !mapRef.current) return;
    headingBusy.current = true;
    mapRef.current
      .getCamera()
      .then((c) => setHeading(c.heading ?? 0))
      .catch(() => {})
      .finally(() => { headingBusy.current = false; });
  }, []);

  function faceNorth() {
    mapRef.current?.animateCamera({ heading: 0 }, { duration: 400 });
  }

  function requireLogin(go: () => void) {
    if (!user) router.push('/login');
    else go();
  }

  const menuItems: MenuItem[] = [
    { key: 'mine', icon: 'list', label: 'Your Issues', onPress: () => requireLogin(() => router.push('/my-issues')) },
    ...(isAdmin ? [{ key: 'admin', icon: 'shield', label: 'Manage Issues', onPress: () => router.push('/admin') } as MenuItem] : []),
    { key: 'settings', icon: 'sliders', label: 'Settings', onPress: () => router.push('/settings') },
    { key: 'help', icon: 'help', label: 'Help', onPress: () => router.push('/help') },
    user
      ? {
          key: 'logout', icon: 'logout', label: 'Logout', destructive: true,
          onPress: () => signOut().catch(() => Alert.alert('Error', 'Could not log out.')),
        }
      : { key: 'login', icon: 'user', label: 'Log in', onPress: () => router.push('/login') },
  ];

  return (
    <View style={s.root}>
      {!ready ? (
        <View style={s.locating}>
          <SignalMark size={64} animated />
          <Text style={s.locatingText}>Finding your location…</Text>
        </View>
      ) : (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        initialRegion={{
          // same offset as the fly-to effect, so the first frame already matches
          latitude: center.latitude - deltaFor(radiusM) * 0.18, longitude: center.longitude,
          latitudeDelta: deltaFor(radiusM), longitudeDelta: deltaFor(radiusM),
        }}
        showsUserLocation={!!loc.userCoords}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onRegionChange={syncHeading}
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
                <View style={[s.pin, { backgroundColor: CATEGORY_COLORS[issue.category] }, selected && s.pinSelected]}>
                  <Icon name={issue.category} size={selected ? 22 : 19} color={white} />
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>
      )}

      <RoundButton
        icon="menu"
        label="Open menu"
        onPress={() => setMenuOpen(true)}
        style={{ position: 'absolute', top: insets.top + spacing.md, left: spacing.lg }}
      />

      {loc.permissionDenied && (
        <TouchableOpacity
          style={[s.notice, { top: insets.top + spacing.md }]}
          onPress={goToMyLocation}
          activeOpacity={0.85}
        >
          <Icon name="locate" size={18} color={colors.surface} />
          <Text style={s.noticeText}>Location is off. Tap to enable</Text>
        </TouchableOpacity>
      )}

      <IssueSheet
        snap={snap}
        onSnapChange={setSnap}
        issues={issues}
        isLoading={!ready || isPending}
        isError={isError}
        onRetry={refetch}
        onRefresh={refetch}
        address={center.label}
        radiusLabel={radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}
        focusedId={focusedIssueId}
        onOpenSearch={() => router.push('/search')}
        onOpenIssue={(id) => router.push(`/issue/${id}`)}
        floating={
          <>
            <CompassButton heading={heading} onPress={faceNorth} />
            <RoundButton
              icon="locate"
              label="Go to my location"
              onPress={goToMyLocation}
              active={loc.isCurrent && !!loc.userCoords}
            />
          </>
        }
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
          <Text style={s.newPostText}>New post</Text>
        </TouchableOpacity>
      )}

      <MenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} items={menuItems} email={user?.email} badge={isAdmin ? 'ADMIN' : undefined} />
    </View>
  );
}

const makeStyles = ({ colors }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    locating: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '28%', gap: spacing.md },
    locatingText: { fontSize: 14, fontWeight: '600', color: colors.muted },
    notice: {
      position: 'absolute', left: 80, right: spacing.lg, height: 48, borderRadius: radius.md,
      backgroundColor: colors.ink, flexDirection: 'row', gap: spacing.sm, alignItems: 'center',
      justifyContent: 'center', ...shadow.float,
    },
    noticeText: { color: colors.surface, fontWeight: '700', fontSize: 13 },
    pinBox: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
    pin: {
      width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: white, ...shadow.card,
    },
    pinSelected: { width: 46, height: 46, borderRadius: 23, borderColor: colors.ink },
    newPost: {
      position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xl, height: 52,
      ...shadow.float,
    },
    newPostText: { color: colors.onAccent, fontSize: 16, fontWeight: '800' },
  });
