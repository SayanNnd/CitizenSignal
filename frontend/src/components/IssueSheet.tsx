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

const HEADER_H = 128; // handle + search bar + address line
/** Room above the sheet for the floating map buttons (two 48px buttons + gap + margin). */
const FLOAT_H = 48 * 2 + 12 + 12;

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
  onOpenSearch: () => void;
  onOpenIssue: (id: string) => void;
  /**
   * Map buttons that ride on top of the sheet. They share the sheet's animation, so they glide
   * with it while dragging and fade out as it reaches the top, instead of remounting and jumping.
   */
  floating?: React.ReactNode;
}

export function IssueSheet({
  snap, onSnapChange, issues, isLoading, isError, onRetry, address, radiusLabel, focusedId,
  onOpenSearch, onOpenIssue, floating,
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
  }, [snap, offsetFor, translateY]);

  // Buttons fade out over the last stretch before the sheet is fully open.
  const floatOpacity = translateY.interpolate({
    inputRange: [offsetFor('full'), offsetFor('full') + FLOAT_H],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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

  const listHeight = Math.max(0, visible[snap] - HEADER_H);

  return (
    <>
      {floating ? (
        // Same geometry as the sheet plus FLOAT_H on top, so the buttons stay inside its bounds
        // (Android doesn't deliver touches to children drawn outside their parent).
        <Animated.View
          pointerEvents={snap === 'full' ? 'none' : 'box-none'}
          style={[s.floatWrap, { height: sheetH + FLOAT_H, opacity: floatOpacity, transform: [{ translateY }] }]}
        >
          <View style={s.floatButtons} pointerEvents="box-none">{floating}</View>
        </Animated.View>
      ) : null}

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
          <Text style={s.count}>
            {isLoading ? radiusLabel : `${issues.length} nearby  ·  ${radiusLabel}`}
          </Text>
        </View>
      </View>

      <View style={[s.list, { height: listHeight }]}>
        {isLoading ? (
          <LoadingState label="Finding issues near you…" />
        ) : isError ? (
          <ErrorState message="Couldn't load issues." onRetry={onRetry} />
        ) : issues.length === 0 ? (
          <EmptyState title="No issues in this area" hint="Be the first to report one with the New Post button." />
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
    </>
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
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      ...shadow.float,
    },
    header: { paddingHorizontal: spacing.lg, height: HEADER_H },
    handle: {
      alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.line, marginTop: spacing.sm, marginBottom: spacing.md,
    },
    search: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, height: 44,
      backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.lg,
    },
    searchText: { color: colors.muted, fontSize: 15 },
    addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
    address: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.ink },
    count: { fontSize: 13, fontWeight: '600', color: colors.muted },
    floatWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    floatButtons: { position: 'absolute', top: 0, right: spacing.lg, gap: spacing.md },
    list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    listContent: { paddingBottom: 120 },
  });
