import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadow, spacing } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { SignalMark } from './SignalMark';

export interface MenuItem {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Shown apart at the bottom of the drawer (e.g. Log out). */
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  email?: string | null;
}

/** Slide-in side menu laid out like X's: account header, then plain icon + label rows. */
export function MenuDrawer({ visible, onClose, items, email }: Props) {
  const { colors, s } = useThemed(makeStyles);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelW = Math.min(320, width * 0.8);
  const x = useRef(new Animated.Value(-panelW)).current;

  useEffect(() => {
    if (visible) Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    else x.setValue(-panelW);
  }, [visible, x, panelW]);

  function close(then?: () => void) {
    Animated.timing(x, { toValue: -panelW, duration: 160, useNativeDriver: true }).start(() => {
      onClose();
      then?.();
    });
  }

  const main = items.filter((i) => !i.destructive);
  const bottom = items.filter((i) => i.destructive);

  function renderRow(item: MenuItem) {
    const tint = item.destructive ? colors.accent : colors.ink;
    return (
      <Pressable
        key={item.key}
        onPress={() => close(item.onPress)}
        style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfaceAlt }]}
        accessibilityRole="button"
      >
        <Icon name={item.icon} size={24} color={tint} />
        <Text style={[s.rowLabel, { color: tint }]}>{item.label}</Text>
      </Pressable>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close()} statusBarTranslucent>
      <View style={s.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close menu" />
        <Animated.View
          style={[
            s.panel,
            { width: panelW, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.md, transform: [{ translateX: x }] },
          ]}
        >
          <View style={s.account}>
            <View style={s.accountTop}>
              <SignalMark size={48} animated={visible} />
              <Pressable onPress={() => close()} hitSlop={12} accessibilityLabel="Close menu">
                <Icon name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={s.name}>CitizenSignal</Text>
            <Text style={s.email} numberOfLines={1}>{email ?? 'Not logged in'}</Text>
          </View>

          <View style={s.divider} />

          {main.map(renderRow)}

          {bottom.length > 0 && (
            <View style={s.bottom}>
              <View style={s.divider} />
              {bottom.map(renderRow)}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ colors }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.overlay },
    panel: { flex: 1, backgroundColor: colors.bg, ...shadow.float },
    account: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    accountTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    name: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: spacing.md },
    email: { fontSize: 15, color: colors.muted, marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg + 4, paddingHorizontal: spacing.lg, paddingVertical: 14 },
    rowLabel: { fontSize: 20, fontWeight: '700' },
    bottom: { marginTop: 'auto' },
  });
