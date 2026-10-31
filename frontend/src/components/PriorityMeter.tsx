import React from 'react';
import { View } from 'react-native';
import { priorityLevel } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';

/** Signal-strength style bars: the more bars, the higher the priority. */
export function PriorityMeter({ priority, resolved }: { priority: number; resolved?: boolean }) {
  const { colors } = useTheme();
  const level = priorityLevel(priority);
  const tint = resolved ? colors.success : level >= 4 ? colors.accent : colors.warn;
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}
      accessibilityLabel={`Priority ${level} of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          style={{ width: 3.5, height: 4 + n * 2, borderRadius: 1.5, backgroundColor: n <= level ? tint : colors.line }}
        />
      ))}
    </View>
  );
}
