import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, shadow, spacing } from '../constants/theme';
import { useThemed, type ThemeValues } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { SignalMark } from './SignalMark';

export interface MenuItem {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  email?: string | null;
}

/** Left slide-in menu from the mock: close, then Your Issues / Settings / Help / Logout. */
export function MenuDrawer({ visible, onClose, items, email }: Props) {
  const { colors, s } = useThemed(makeStyles);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelW = Math.min(330, width * 0.84);
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close()} statusBarTranslucent>
      <View style={s.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close menu" />
        <Animated.View
          style={[
            s.panel,
            { width: panelW, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg, transform: [{ translateX: x }] },
          ]}
        >
          <TouchableOpacity style={s.close} onPress={() => close()} accessibilityLabel="Close menu">
            <Icon name="close" size={20} color={colors.ink} />
          </TouchableOpacity>

          <View style={s.brand}>
            <SignalMark size={52} />
            <Text style={s.brandName}>CitizenSignal</Text>
            <Text style={s.account}>{email ?? 'Browsing as guest'}</Text>
          </View>

          <View style={s.items}>
            {items.map((item) => (
              <TouchableOpacity key={item.key} style={s.item} onPress={() => close(item.onPress)} activeOpacity={0.7}>
                <View style={[s.itemIcon, item.destructive && { backgroundColor: colors.accentSoft }]}>
                  <Icon name={item.icon} size={20} color={item.destructive ? colors.accent : colors.ink} />
                </View>
                <Text style={[s.itemLabel, item.destructive && { color: colors.accent }]}>{item.label}</Text>
                <Icon name="chevron-right" size={16} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.footer}>Report it. Merge it. Fix it.</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.overlay },
    panel: {
      flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.lg,
      borderTopRightRadius: radius.xl, borderBottomRightRadius: radius.xl, ...shadow.float,
    },
    close: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt,
      alignItems: 'center', justifyContent: 'center',
    },
    brand: { marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.xs, alignItems: 'flex-start' },
    brandName: { ...type.display, fontSize: 26, marginTop: spacing.sm },
    account: type.caption,
    items: { gap: spacing.sm },
    item: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, height: 58, paddingHorizontal: spacing.md,
      borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.bg,
    },
    itemIcon: {
      width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surfaceAlt,
      alignItems: 'center', justifyContent: 'center',
    },
    itemLabel: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink },
    footer: { ...type.mono, marginTop: 'auto', textAlign: 'center' },
  });
