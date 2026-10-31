import { Platform, TextStyle } from 'react-native';

export interface Palette {
  ink: string;
  inkSoft: string;
  muted: string;
  line: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warn: string;
  onAccent: string;
  overlay: string;
  /** Priority triangle colours on posts: low, medium, high severity. */
  severityLow: string;
  severityMedium: string;
  severityHigh: string;
}

/** Warm paper + ink + signal vermilion. */
export const lightPalette: Palette = {
  ink: '#17202A',
  inkSoft: '#505B66',
  muted: '#88909A',
  line: '#DDD8CB',
  bg: '#F3F0E9',
  surface: '#FFFDF9',
  surfaceAlt: '#EAE6DB',
  accent: '#E4572E',
  accentSoft: '#FBE5DD',
  success: '#1E8E5E',
  successSoft: '#DCF1E6',
  warn: '#D98E04',
  onAccent: '#FFFFFF',
  overlay: 'rgba(23, 32, 42, 0.5)',
  severityLow: '#D4A72C',
  severityMedium: '#EE7D1F',
  severityHigh: '#D93025',
};

/** Night-shift blue-black with the same vermilion. */
export const darkPalette: Palette = {
  ink: '#EDF0F3',
  inkSoft: '#AEB8C2',
  muted: '#78858F',
  line: '#2A3541',
  bg: '#0D1217',
  surface: '#161D25',
  surfaceAlt: '#1F2832',
  accent: '#FF6B3D',
  accentSoft: '#3B2018',
  success: '#37C28A',
  successSoft: '#143127',
  warn: '#F0B13A',
  onAccent: '#1B0F0A',
  overlay: 'rgba(0, 0, 0, 0.62)',
  severityLow: '#F2C94C',
  severityMedium: '#FF9440',
  severityHigh: '#FF5A4E',
};

export const white = '#FFFFFF';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Deliberately tight corners; circles (avatars, map buttons) use size / 2 instead. */
export const radius = { sm: 3, md: 4, lg: 6, xl: 10, pill: 999 };

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

export function makeType(c: Palette) {
  const display: TextStyle = { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, color: c.ink };
  const title: TextStyle = { fontSize: 21, fontWeight: '800', letterSpacing: -0.3, color: c.ink };
  const heading: TextStyle = { fontSize: 16, fontWeight: '700', color: c.ink };
  const body: TextStyle = { fontSize: 14, color: c.inkSoft, lineHeight: 21 };
  const caption: TextStyle = { fontSize: 12, color: c.muted };
  const label: TextStyle = { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: c.muted };
  const mono: TextStyle = { fontFamily: fonts.mono, fontSize: 12, color: c.muted };
  return { display, title, heading, body, caption, label, mono };
}
