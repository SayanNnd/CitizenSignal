import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { Category } from '../types';

export type UiIconName =
  | 'menu' | 'close' | 'plus' | 'search' | 'locate' | 'pin' | 'camera' | 'image' | 'check'
  | 'arrow-up' | 'send' | 'comment' | 'sliders' | 'help' | 'logout' | 'user' | 'list'
  | 'clock' | 'alert' | 'shield' | 'chevron-down' | 'chevron-up' | 'chevron-right' | 'chevron-left';

/** UI glyphs plus one glyph per issue category, all drawn from Views (no icon package, no emoji). */
export type IconName = UiIconName | Category;

type Side = 't' | 'r' | 'b' | 'l';
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

interface Shape {
  l: number; t: number; w: number; h: number;
  r?: number;
  rr?: [number, number, number, number]; // per-corner radii: tl, tr, br, bl
  rot?: number;
  bw?: number; // set = outline with this stroke width
  sides?: Side[]; // outline only on these sides
  tri?: 'up' | 'down';
}

const bar = (l: number, t: number, w: number, h = 2): Shape => ({ l, t, w, h, r: h / 2 });
const ring = (l: number, t: number, d: number, bw = 2): Shape => ({ l, t, w: d, h: d, r: d / 2, bw });
const dot = (l: number, t: number, d: number): Shape => ({ l, t, w: d, h: d, r: d / 2 });
const chev = (l: number, t: number, rot: number): Shape => ({ l, t, w: 10, h: 10, rot, bw: 2, sides: ['r', 'b'] });

const SHAPES: Record<string, Shape[]> = {
  menu: [bar(4, 6, 16), bar(4, 11, 11), bar(4, 16, 16)],
  close: [{ ...bar(3, 11, 18), rot: 45 }, { ...bar(3, 11, 18), rot: -45 }],
  plus: [bar(4, 11, 16), bar(11, 4, 2, 16)],
  search: [ring(3, 3, 14), { ...bar(15, 17.5, 7), rot: 45 }],
  locate: [ring(5, 5, 14), dot(9.5, 9.5, 5), bar(11, 1, 2, 4), bar(11, 19, 2, 4), bar(1, 11, 4, 2), bar(19, 11, 4, 2)],
  pin: [{ l: 5.5, t: 2.5, w: 13, h: 13, rr: [6.5, 6.5, 0, 6.5], rot: 45, bw: 2 }, dot(9.5, 6.5, 5)],
  camera: [{ ...ring(2, 7, 20), r: 3, h: 13 }, { l: 8, t: 4, w: 8, h: 3.5, r: 1 }, ring(8, 10.5, 8)],
  image: [{ l: 2, t: 4, w: 20, h: 16, r: 3, bw: 2 }, dot(6, 8, 4), { ...bar(8.5, 14.5, 7), rot: -45 }, { ...bar(12.5, 14.5, 7), rot: 45 }],
  check: [{ l: 9, t: 5, w: 6, h: 12, bw: 2.4, sides: ['r', 'b'], rot: 45 }],
  'arrow-up': [{ l: 5, t: 3, w: 14, h: 10, tri: 'up' }, { l: 10.5, t: 12, w: 3, h: 9, r: 1.5 }],
  send: [{ l: 5, t: 3, w: 14, h: 10, tri: 'up' }, { l: 10.5, t: 12, w: 3, h: 9, r: 1.5 }],
  comment: [{ l: 2, t: 3, w: 20, h: 14, r: 4, bw: 2 }, { l: 4.5, t: 15.5, w: 5, h: 5, bw: 2, sides: ['l', 'b'], rot: 45 }, bar(7, 8, 10)],
  sliders: [
    bar(3, 5, 9), ring(12, 3, 6), bar(18, 5, 3),
    bar(3, 11, 3), ring(6, 9, 6), bar(12, 11, 9),
    bar(3, 17, 8), ring(11, 15, 6), bar(17, 17, 4),
  ],
  help: [ring(2, 2, 20)],
  alert: [ring(2, 2, 20)],
  logout: [bar(3, 3, 2, 18), bar(3, 3, 8), bar(3, 19, 8), bar(10, 11, 11), { l: 14, t: 8.5, w: 7, h: 7, rot: -45, bw: 2, sides: ['r', 'b'] }],
  user: [dot(8, 3, 8), { l: 4, t: 14, w: 16, h: 7, rr: [8, 8, 2, 2] }],
  list: [dot(3, 4.5, 3), bar(8, 5, 13), dot(3, 10.5, 3), bar(8, 11, 13), dot(3, 16.5, 3), bar(8, 17, 13)],
  clock: [ring(3, 3, 18), bar(11, 7, 2, 6), bar(11, 11, 5)],
  shield: [{ l: 4, t: 2, w: 16, h: 20, rr: [3, 3, 8, 8], bw: 2 }, { l: 10, t: 6.5, w: 4.5, h: 8, bw: 2, sides: ['r', 'b'], rot: 45 }],
  'chevron-down': [chev(7, 5, 45)],
  'chevron-up': [chev(7, 9, -135)],
  'chevron-right': [chev(4.5, 7, -45)],
  'chevron-left': [chev(9.5, 7, 135)],

  // categories
  pothole: [{ l: 2, t: 8, w: 20, h: 11, r: 5.5, bw: 2 }, { l: 7, t: 11.5, w: 10, h: 4, r: 2 }, bar(1, 21, 5), bar(18, 21, 5)],
  streetlight: [bar(6, 3, 2, 18), bar(6, 3, 14), { l: 15, t: 5, w: 6, h: 3, rr: [0, 0, 3, 3] }, bar(17, 10, 2, 3), bar(3, 20, 8)],
  garbage: [bar(3, 5, 18), { l: 9, t: 2, w: 6, h: 3.5, rr: [2, 2, 0, 0] }, { l: 5, t: 8, w: 14, h: 13, rr: [1, 1, 3, 3], bw: 2 }, bar(9.5, 11, 1.5, 7), bar(13, 11, 1.5, 7)],
  water_leak: [{ l: 6, t: 8, w: 12, h: 12, rr: [0, 6, 6, 6], rot: 45 }],
  drainage: [ring(3, 3, 18), bar(7, 8, 10), bar(7, 11, 10), bar(7, 14, 10)],
  road_damage: [{ l: 6, t: 3, w: 12, h: 15, tri: 'up' }, bar(3, 18, 18, 3)],
  other: [ring(3, 3, 18), dot(9, 9, 6)],
};

function renderShape(s: Shape, i: number, u: number, color: string) {
  const base: ViewStyle = { position: 'absolute', left: s.l * u, top: s.t * u };

  if (s.tri) {
    const half = (s.w * u) / 2;
    const style: Mutable<ViewStyle> = {
      ...base, width: 0, height: 0,
      borderLeftWidth: half, borderRightWidth: half,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
    };
    if (s.tri === 'up') { style.borderBottomWidth = s.h * u; style.borderBottomColor = color; }
    else { style.borderTopWidth = s.h * u; style.borderTopColor = color; }
    return <View key={i} style={style} />;
  }

  const style: Mutable<ViewStyle> = { ...base, width: s.w * u, height: s.h * u };
  if (s.rr) {
    style.borderTopLeftRadius = s.rr[0] * u;
    style.borderTopRightRadius = s.rr[1] * u;
    style.borderBottomRightRadius = s.rr[2] * u;
    style.borderBottomLeftRadius = s.rr[3] * u;
  } else {
    style.borderRadius = (s.r ?? 0) * u;
  }

  if (s.bw) {
    const w = s.bw * u;
    style.borderColor = color;
    if (s.sides) {
      for (const side of s.sides) {
        if (side === 't') style.borderTopWidth = w;
        if (side === 'r') style.borderRightWidth = w;
        if (side === 'b') style.borderBottomWidth = w;
        if (side === 'l') style.borderLeftWidth = w;
      }
    } else {
      style.borderWidth = w;
    }
  } else {
    style.backgroundColor = color;
  }
  if (s.rot) style.transform = [{ rotate: `${s.rot}deg` }];
  return <View key={i} style={style} />;
}

interface Props {
  name: IconName;
  size?: number;
  color: string;
  /** Extra rotation in degrees (the send icon is the upvote arrow turned sideways). */
  rotate?: number;
}

export function Icon({ name, size = 22, color, rotate }: Props) {
  const u = size / 24;
  const shapes = SHAPES[name] ?? [];
  const rot = name === 'send' ? 90 + (rotate ?? 0) : rotate;
  const text = name === 'help' ? '?' : name === 'alert' ? '!' : null;

  return (
    <View
      style={{ width: size, height: size, pointerEvents: 'none', transform: rot ? [{ rotate: `${rot}deg` }] : undefined }}
    >
      {shapes.map((s, i) => renderShape(s, i, u, color))}
      {text ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={{ color, fontSize: 13 * u, fontWeight: '800', includeFontPadding: false }}>{text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
