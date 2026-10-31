import React from 'react';
import { StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { shadow } from '../constants/theme';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  icon: IconName;
  onPress: () => void;
  label: string;
  active?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Circular floating button (menu, locate-me) as in the mock. */
export function RoundButton({ icon, onPress, label, active, size = 48, style }: Props) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.btn,
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: active ? colors.accent : colors.surface, borderColor: colors.line,
        },
        style,
      ]}
    >
      <Icon name={icon} size={22} color={active ? colors.onAccent : colors.ink} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, ...shadow.float },
});
