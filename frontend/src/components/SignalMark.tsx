import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const RINGS = 3;
const PULSE_MS = 2400;

/**
 * The app's mark: a dot broadcasting rings. With `animated`, the rings run like a sonar ping:
 * each one grows out of the dot and fades, staggered so there is always one on its way out.
 */
export function SignalMark({ size = 64, animated = false }: { size?: number; animated?: boolean }) {
  const { colors } = useTheme();
  const ringW = Math.max(2, size / 22);
  const pings = useRef(Array.from({ length: RINGS }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) return;
    const running = pings.map((p, i) =>
      Animated.sequence([
        Animated.delay((PULSE_MS / RINGS) * i),
        Animated.loop(
          Animated.timing(p, { toValue: 1, duration: PULSE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ),
      ]),
    );
    running.forEach((a) => a.start());
    return () => running.forEach((a) => a.stop());
  }, [animated, pings]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {animated
        ? pings.map((p, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute', width: size, height: size, borderRadius: size / 2,
                borderWidth: ringW, borderColor: colors.accent,
                opacity: p.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
                transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
              }}
            />
          ))
        : [1, 0.7, 0.42].map((k, i) => (
            <View
              key={k}
              style={{
                position: 'absolute', width: size * k, height: size * k, borderRadius: size,
                borderWidth: ringW, borderColor: colors.accent, opacity: 0.28 + i * 0.3,
              }}
            />
          ))}
      <View style={{ width: size * 0.2, height: size * 0.2, borderRadius: size, backgroundColor: colors.accent }} />
    </View>
  );
}
