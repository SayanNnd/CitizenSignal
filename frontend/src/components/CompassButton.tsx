import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { shadow } from '../constants/theme';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  /** Map heading in degrees; the needle counter-rotates so red always points north. */
  heading: number;
  onPress: () => void;
  size?: number;
}

/** Replaces the native map compass; tapping it turns the map back to north. */
export function CompassButton({ heading, onPress, size = 48 }: Props) {
  const { colors } = useTheme();
  const needleW = size * 0.15;
  const needleH = size * 0.3;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Compass, tap to face north"
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <View style={{ alignItems: 'center', transform: [{ rotate: `${-heading}deg` }] }}>
        <Text style={[styles.n, { color: colors.accent, fontSize: size * 0.2 }]}>N</Text>
        <View
          style={{
            width: 0, height: 0, borderLeftWidth: needleW, borderRightWidth: needleW, borderBottomWidth: needleH,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.accent,
          }}
        />
        <View
          style={{
            width: 0, height: 0, borderLeftWidth: needleW, borderRightWidth: needleW, borderTopWidth: needleH,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.muted,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, ...shadow.float },
  n: { fontWeight: '900', lineHeight: 12, marginBottom: 1 },
});
