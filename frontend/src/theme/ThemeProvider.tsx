import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, lightPalette, makeType, type Palette } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeValues {
  colors: Palette;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  type: ReturnType<typeof makeType>;
}

const STORAGE_KEY = 'cs.theme_mode';
const ThemeContext = createContext<ThemeValues | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';

  const value = useMemo<ThemeValues>(() => {
    const colors = isDark ? darkPalette : lightPalette;
    return { colors, isDark, mode, setMode, type: makeType(colors) };
  }, [isDark, mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Theme values plus a StyleSheet rebuilt whenever the theme changes. */
export function useThemed<T>(factory: (t: ThemeValues) => T) {
  const theme = useTheme();
  const s = useMemo(() => factory(theme), [factory, theme]);
  return { ...theme, s };
}
