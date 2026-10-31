import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { severityOf, type Severity } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';

const LABELS: Record<Severity, string> = { low: 'Low priority', medium: 'Medium priority', high: 'High priority' };

interface Props {
  priority: number;
  size?: number;
  /** Show "High priority" etc. next to the triangle. */
  withLabel?: boolean;
}

/** Small warning triangle whose colour shows how urgent an issue is (colours live in the theme palette). */
export function SeverityTriangle({ priority, size = 14, withLabel }: Props) {
  const { colors } = useTheme();
  const severity = severityOf(priority);
  const color = { low: colors.severityLow, medium: colors.severityMedium, high: colors.severityHigh }[severity];
  const half = size * 0.58;

  return (
    <View style={styles.row} accessibilityLabel={LABELS[severity]}>
      <View
        style={{
          width: 0, height: 0,
          borderLeftWidth: half, borderRightWidth: half, borderBottomWidth: size,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
        }}
      />
      {withLabel ? <Text style={[styles.label, { color }]}>{LABELS[severity]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '700' },
});
