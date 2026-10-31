import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Issue } from '../types';
import { IssueCard } from './IssueCard';
import { Icon } from './Icon';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { radius, shadow, spacing } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';

export type Snap = 'collapsed' | 'half' | 'full';
export type IssueFilter = 'all' | 'open' | 'resolved' | 'recurring';

const FILTERS: { key: IssueFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'recurring', label: 'Recurring' },
];

const HEADER_H = 128; // handle + search bar + address line
const CHIPS_H = 46;

interface Props {
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  issues: Issue[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  address: string;
  radiusLabel: string;
  focusedId: string | null;
  filter: IssueFilter;
  onFilterChange: (f: IssueFilter) => void;
  counts: Record<IssueFilter, number>;
  onOpenSearch: () => void;
  onOpenIssue: (id: string) => void;
  /** Reported so the screen can place floating buttons just above the sheet. */
  onVisibleHeight?: (h: number) => void;
}

export function IssueSheet({
  snap, onSnapChange, issues, isLoading, isError, onRetry, address, radiusLabel, focusedId,
  filter, onFilterChange, counts, onOpenSearch, onOpenIssue, onVisibleHeight,
}: Props) {
  const { colors, s } = useThemed(makeStyles);
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetH = Math.round(windowH * 0.9);

  const visible = useMemo(
    () => ({
      collapsed: 84 + insets.bottom,
      half: Math.round(windowH * 0.5),
      full: sheetH,
    }),
    [windowH, insets.bottom, sheetH],
  );
  const offsetFor = useCallback((sn: Snap) => sheetH - visible[sn], [sheetH, visible]);

  const translateY = useRef(new Animated.Value(offsetFor(snap))).current;
  const base = useRef(offsetFor(snap));

  useEffect(() => {
    base.current = offsetFor(snap);
    Animated.spring(translateY, { toValue: base.current, useNativeDriver: true, bounciness: 4, speed: 14 }).start();
    onVisibleHeight?.(visible[snap]);
  }, [snap, offsetFor, translateY, visible, onVisibleHeight]);

  const snapRef = useRef(snap);
  snapRef.current = snap;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          const min = offsetFor('full');
          const max = offsetFor('collapsed');
          translateY.setValue(Math.min(max, Math.max(min, base.current + g.dy)));
        },
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dy) < 4 && Math.abs(g.dx) < 4) {
            // tap on the handle cycles collapsed -> half -> full
            const cur = snapRef.current;
            onSnapChange(cur === 'collapsed' ? 'half' : cur === 'half' ? 'full' : 'half');
            return;
          }
          const target = base.current + g.dy + g.vy * 120;
          const order: Snap[] = ['full', 'half', 'collapsed'];
          const best = order.reduce((a, b) =>
            Math.abs(offsetFor(a) - target) <= Math.abs(offsetFor(b) - target) ? a : b,
          );
          if (best === snapRef.current) {
            Animated.spring(translateY, { toValue: offsetFor(best), useNativeDriver: true }).start();
          } else {
            onSnapChange(best);
          }
        },
      }),
    [offsetFor, onSnapChange, translateY],
  );

  const listRef = useRef<FlatList<Issue>>(null);
  useEffect(() => {
    if (!focusedId) return;
    const index = issues.findIndex((i) => i.id === focusedId);
    if (index < 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
    }, 250);
    return () => clearTimeout(t);
  }, [focusedId, issues]);

  const listHeight = Math.max(0, visible[snap] - HEADER_H - CHIPS_H);

  return (
    <Animated.View style={[s.sheet, { height: sheetH, transform: [{ translateY }] }]}>
      <View {...pan.panHandlers} style={s.header}>
        <View style={s.handle} />
        <TouchableOpacity style={s.search} onPress={onOpenSearch} activeOpacity={0.8} accessibilityRole="search">
          <Icon name="search" size={18} color={colors.muted} />
          <Text style={s.searchText}>Search locations or issues</Text>
        </TouchableOpacity>
        <View style={s.addressRow}>
          <Icon name="pin" size={15} color={colors.accent} />
          <Text style={s.address} numberOfLines={1}>{address}</Text>
          <Text style={s.count}>{radiusLabel}</Text>
        </View>
      </View>

      <View style={s.chips}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => onFilterChange(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
              <Text style={[s.chipCount, active && s.chipTextActive]}>{isLoading ? '-' : counts[f.key]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: listHeight }}>
        {isLoading ? (
          <LoadingState label="Finding issues near you…" />
        ) : isError ? (
          <ErrorState message="Couldn't load issues." onRetry={onRetry} />
        ) : issues.length === 0 ? (
          filter === 'all' ? (
            <EmptyState title="No issues in this area" hint="Be the first to report one with the New Post button." />
          ) : (
            <EmptyState icon="list" title="Nothing matches this filter" hint="Try another filter or widen the search radius in Settings." />
          )
        ) : (
          <FlatList
            ref={listRef}
            data={issues}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <IssueCard issue={item} highlighted={item.id === focusedId} onPress={() => onOpenIssue(item.id)} />
            )}
            onScrollBeginDrag={() => snap === 'half' && onSnapChange('full')}
            onScrollToIndexFailed={({ averageItemLength, index }) =>
              listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true })
            }
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Animated.View>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderColor: colors.line,
      ...shadow.float,
    },
    header: { paddingHorizontal: spacing.lg, height: HEADER_H },
    handle: {
      alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
      backgroundColor: colors.line, marginTop: spacing.sm, marginBottom: spacing.md,
    },
    search: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, height: 46,
      backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg,
      borderWidth: 1.5, borderColor: colors.line,
    },
    searchText: { color: colors.muted, fontSize: 15 },
    addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
    address: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink },
    count: { ...type.mono, fontWeight: '700' },
    chips: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, height: CHIPS_H, alignItems: 'center' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: spacing.md,
      borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
    chipText: { fontSize: 12.5, fontWeight: '700', color: colors.inkSoft },
    chipCount: { ...type.mono, fontWeight: '700' },
    chipTextActive: { color: colors.surface },
    listContent: { paddingTop: spacing.xs, paddingBottom: 120 },
  });
