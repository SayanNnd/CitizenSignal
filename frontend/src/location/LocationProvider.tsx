import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDistance } from 'geolib';
import { DEFAULT_RADIUS_M, MAX_RADIUS_M } from '../constants/limits';

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
/** Never keep the app waiting on a slow GPS for longer than this. */
const READY_TIMEOUT_MS = 6000;
/** A fresh GPS fix only moves the area if the phone is this far from its last known position. */
const MOVE_THRESHOLD_M = 300;
const CURRENT_LABEL = 'Current location';

export const RADIUS_OPTIONS = [500, 1000, 2000, 5000];

interface LocationContextValue {
  /** Area whose issues are shown (user's position or a searched locality). */
  center: Place;
  /** False until the first location is known (or we gave up waiting); don't load issues before. */
  ready: boolean;
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
  const [ready, setReady] = useState(false);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCurrent, setIsCurrent] = useState(true);
  const [radius, setRadiusState] = useState(DEFAULT_RADIUS_M);
  const [recent, setRecent] = useState<Place[]>([]);
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);

  const isCurrentRef = useRef(true);
  isCurrentRef.current = isCurrent;

  /** Show the coordinates straight away; fill in the street name when the geocoder answers. */
  const moveTo = useCallback((coords: Coords) => {
    setCenter({ ...coords, label: CURRENT_LABEL });
    labelFor(coords).then((label) =>
      setCenter((c) => (c.latitude === coords.latitude && c.longitude === coords.longitude ? { ...c, label } : c)),
    );
  }, []);

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
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        setReady(true);
      }
    };
    const timer = setTimeout(finish, READY_TIMEOUT_MS);

    (async () => {
      try {
        const [r, rec] = await Promise.all([AsyncStorage.getItem(RADIUS_KEY), AsyncStorage.getItem(RECENT_KEY)]);
        if (r) setRadiusState(Math.min(Math.max(Number(r) || DEFAULT_RADIUS_M, 1), MAX_RADIUS_M));
        if (rec) setRecent(JSON.parse(rec));
      } catch {
        // storage is only a convenience
      }

      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' as const }));
      if (status !== 'granted') {
        setPermissionDenied(true);
        finish();
        return;
      }

      // 1. Last known fix is instant: start loading issues right away from it.
      let start: Coords | null = null;
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) start = { latitude: last.coords.latitude, longitude: last.coords.longitude };
      } catch {
        // no cached fix; wait for a fresh one
      }
      if (start) {
        setUserCoords(start);
        moveTo(start);
        finish();
      }

      // 2. Fresh fix: only move the area if the phone is actually somewhere else, to avoid a reload.
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const fresh = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserCoords(fresh);
        const moved = !start || getDistance(start, fresh) > MOVE_THRESHOLD_M;
        if (moved && isCurrentRef.current) moveTo(fresh);
      } catch {
        // keep whatever we had
      }
      finish();
    })();

    return () => clearTimeout(timer);
  }, [moveTo]);

  const setRadius = useCallback((m: number) => {
    const clamped = Math.min(m, MAX_RADIUS_M);
    setRadiusState(clamped);
    AsyncStorage.setItem(RADIUS_KEY, String(clamped)).catch(() => {});
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
    moveTo(coords);
  }, [userCoords, locate, moveTo]);

  const value = useMemo(
    () => ({
      center, ready, userCoords, permissionDenied, isCurrent, radius, setRadius, recent,
      selectPlace, useMyLocation, focusedIssueId, setFocusedIssueId,
    }),
    [center, ready, userCoords, permissionDenied, isCurrent, radius, setRadius, recent, selectPlace, useMyLocation, focusedIssueId],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used within LocationProvider');
  return ctx;
}
