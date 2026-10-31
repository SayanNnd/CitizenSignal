import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface Place extends Coords {
  label: string;
}

const FALLBACK: Place = { latitude: 28.6139, longitude: 77.209, label: 'New Delhi' };
const RADIUS_KEY = 'cs.radius_m';
const RECENT_KEY = 'cs.recent_places';
const MAX_RECENT = 5;

export const RADIUS_OPTIONS = [500, 1000, 2000, 5000];

interface LocationContextValue {
  /** Area whose issues are shown (user's position or a searched locality). */
  center: Place;
  /** Real GPS position, if permission was granted. */
  userCoords: Coords | null;
  permissionDenied: boolean;
  /** True while the centre is the user's own position. */
  isCurrent: boolean;
  radius: number;
  setRadius: (m: number) => void;
  recent: Place[];
  /** Move the whole app to a searched locality. */
  selectPlace: (place: Place) => void;
  /** Go back to the user's GPS position. */
  useMyLocation: () => Promise<void>;
  /** Issue picked from the search screen; the map should zoom to it. */
  focusedIssueId: string | null;
  setFocusedIssueId: (id: string | null) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export async function labelFor(coords: Coords): Promise<string> {
  try {
    const [a] = await Location.reverseGeocodeAsync(coords);
    if (!a) return 'Selected area';
    const parts = [a.name && a.name !== a.street ? a.name : a.street, a.district ?? a.subregion, a.city]
      .filter((p): p is string => !!p);
    const unique = parts.filter((p, i) => parts.indexOf(p) === i).slice(0, 2);
    return unique.join(', ') || a.region || 'Selected area';
  } catch {
    return 'Selected area';
  }
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [center, setCenter] = useState<Place>(FALLBACK);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCurrent, setIsCurrent] = useState(true);
  const [radius, setRadiusState] = useState(2000);
  const [recent, setRecent] = useState<Place[]>([]);
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<Coords | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      return null;
    }
    setPermissionDenied(false);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserCoords(coords);
      return coords;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [r, rec] = await Promise.all([AsyncStorage.getItem(RADIUS_KEY), AsyncStorage.getItem(RECENT_KEY)]);
        if (r) setRadiusState(Number(r));
        if (rec) setRecent(JSON.parse(rec));
      } catch {
        // storage is only a convenience
      }
      const coords = await locate();
      if (coords) setCenter({ ...coords, label: await labelFor(coords) });
    })();
  }, [locate]);

  const setRadius = useCallback((m: number) => {
    setRadiusState(m);
    AsyncStorage.setItem(RADIUS_KEY, String(m)).catch(() => {});
  }, []);

  const selectPlace = useCallback((place: Place) => {
    setCenter(place);
    setIsCurrent(false);
    setFocusedIssueId(null);
    setRecent((prev) => {
      const next = [place, ...prev.filter((p) => p.label !== place.label)].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const useMyLocation = useCallback(async () => {
    const coords = userCoords ?? (await locate());
    if (!coords) return;
    setIsCurrent(true);
    setFocusedIssueId(null);
    setCenter({ ...coords, label: await labelFor(coords) });
  }, [userCoords, locate]);

  const value = useMemo(
    () => ({
      center, userCoords, permissionDenied, isCurrent, radius, setRadius, recent,
      selectPlace, useMyLocation, focusedIssueId, setFocusedIssueId,
    }),
    [center, userCoords, permissionDenied, isCurrent, radius, setRadius, recent, selectPlace, useMyLocation, focusedIssueId],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used within LocationProvider');
  return ctx;
}
