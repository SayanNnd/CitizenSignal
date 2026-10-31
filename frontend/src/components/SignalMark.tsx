import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** The app's mark: a dot broadcasting concentric rings. */
export function SignalMark({ size = 64 }: { size?: number }) {
  const { colors } = useTheme();
  const ringW = Math.max(2, size / 22);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {[1, 0.7, 0.42].map((k, i) => (
        <View
          key={k}
          style={{
            position: 'absolute', width: size * k, height: size * k, borderRadius: size,
            borderWidth: ringW, borderColor: colors.accent, opacity: 0.28 + i * 0.3,
          }}
        />
      ))}
      <View style={{ width: size * 0.18, height: size * 0.18, borderRadius: size, backgroundColor: colors.accent }} />
    </View>
  );
}
