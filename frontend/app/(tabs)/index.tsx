import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useIssues } from '@/hooks/useIssues';
import { CATEGORY_COLORS } from '@/constants/categories';

const DEFAULT_REGION = { latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.01, longitudeDelta: 0.01 };

export default function MapScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationError(true); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  const coords = location ?? { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude };
  const { data: issues, isLoading, isError } = useIssues(coords.latitude, coords.longitude);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#e53935" /></View>;
  }
  if (isError) {
    return <View style={styles.center}><Text style={styles.errorText}>Failed to load issues.</Text></View>;
  }

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={location ? { ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 } : DEFAULT_REGION}
      showsUserLocation={!!location}
    >
      {(issues ?? []).map((issue) => (
        <Marker
          key={issue.id}
          coordinate={{ latitude: issue.latitude, longitude: issue.longitude }}
          pinColor={CATEGORY_COLORS[issue.category]}
          title={issue.title}
          description={`${issue.status} · ▲ ${issue.upvotes}`}
          onCalloutPress={() => router.push(`/issue/${issue.id}`)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#e53935', fontSize: 15 },
});

