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

/**
 * Blush pastels. Base swatches: Alabaster Grey #d8e2dc, Powder Petal #ffe5d9, Pastel Pink #ffcad4,
 * Cherry Blossom #f4acb7, Dusty Mauve #9d8189. All five are too light to be text (best is Dusty Mauve
 * at 3.3:1 on the background), so they are the surfaces, highlights, dividers and map, and the text
 * and accent colours are deeper shades of the same mauve and rose.
 * Contrast vs bg: ink 14.3, inkSoft 7.9, muted 5.2, accent 5.3, success 5.2 (all ≥ 4.5).
 */
export const lightPalette: Palette = {
  ink: '#2E2127', // near-black with a mauve cast
  inkSoft: '#5C474F',
  muted: '#7A6168', // Dusty Mauve, deepened to be readable
  line: '#D8E2DC', // Alabaster Grey
  bg: '#FFF4EE', // Powder Petal, lightened
  surface: '#FFFAF7',
  surfaceAlt: '#FFE5D9', // Powder Petal: inputs, pressed rows
  accent: '#A9455F', // deep rose (Cherry Blossom's hue, dark enough for text)
  accentSoft: '#FFCAD4', // Pastel Pink: highlighted rows, soft badges
  success: '#237550',
  successSoft: '#DDEFE5',
  warn: '#8A6500',
  onAccent: '#FFFFFF', // white on the deep rose is 5.7:1
  overlay: 'rgba(46, 33, 39, 0.45)',
  severityLow: '#8A6500',
  severityMedium: '#B9531A',
  severityHigh: '#C8323F',
};

/**
 * Midnight violet / berry. Base swatches: Coffee Bean #110e1b, Midnight Violet #191528 and #3c162f,
 * Crimson Violet #5c162e, Dark Amaranth #7c162e. Dark Amaranth is only 1.8:1 on the background,
 * too dark for text or icons, so the accent is a dusty rose from the same family (7.5:1), kept
 * low in saturation (58%) so it doesn't shout against the violet.
 * Contrast vs bg: ink 16.4, inkSoft 10.2, muted 6.1, accent 7.5 (all ≥ 4.5).
 */
export const darkPalette: Palette = {
  ink: '#F3ECF4',
  inkSoft: '#C7B9CE',
  muted: '#9A8CA6',
  line: '#5C162E', // Crimson Violet
  bg: '#110E1B', // Coffee Bean
  surface: '#191528', // Midnight Violet
  surfaceAlt: '#241D36', // a step lighter than surface: inputs, pressed rows
  accent: '#E0899F', // dusty rose (lightened, desaturated Dark Amaranth)
  accentSoft: '#3C162F', // Midnight Violet (berry): highlighted rows, soft badges
  success: '#3FCF92',
  successSoft: '#13302A',
  warn: '#F2B84B',
  onAccent: '#110E1B', // dark text on the accent (7.5:1; white would be too faint)
  overlay: 'rgba(17, 14, 27, 0.72)',
  severityLow: '#F2C94C',
  severityMedium: '#FF9F4A',
  severityHigh: '#FF6070',
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
