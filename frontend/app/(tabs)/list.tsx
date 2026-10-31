import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useIssues } from '@/hooks/useIssues';
import { IssueCard } from '@/components/IssueCard';

const DEFAULT = { latitude: 28.6139, longitude: 77.209 };

export default function ListScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState(DEFAULT);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) =>
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
      );
    });
  }, []);

  const { data: issues, isLoading, isError, refetch } = useIssues(coords.latitude, coords.longitude);

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#e53935" /></View>;
  if (isError) return <View style={styles.center}><Text style={styles.error}>Failed to load issues. <Text onPress={() => refetch()} style={styles.retry}>Retry</Text></Text></View>;

  return (
    <FlatList
      data={issues ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <IssueCard issue={item} onPress={() => router.push(`/issue/${item.id}`)} />
      )}
      ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No issues nearby. Be the first to report one!</Text></View>}
      contentContainerStyle={issues?.length === 0 ? styles.emptyContainer : { paddingVertical: 8 }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#e53935', textAlign: 'center' },
  retry: { textDecorationLine: 'underline' },
  empty: { color: '#888', textAlign: 'center', fontSize: 15 },
  emptyContainer: { flex: 1 },
});

