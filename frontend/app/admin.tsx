import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { useLocationContext } from '@/location/LocationProvider';
import { useAreaIssues, useSetIssueStatus } from '@/hooks/useIssues';
import { IssueCard } from '@/components/IssueCard';
import { AdminStatusButton } from '@/components/AdminStatusButton';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { Icon } from '@/components/Icon';
import { fmtDate } from '@/lib/format';
import { radius, spacing } from '@/constants/theme';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';
import type { Issue, Status } from '@/types';

type Filter = Status | 'all';

const FILTERS: { key: Filter; label: string; empty: string }[] = [
  { key: 'open', label: 'Open', empty: 'No open issues here' },
  { key: 'resolved', label: 'Fixed', empty: 'Nothing fixed here yet' },
  { key: 'all', label: 'All', empty: 'No issues in this area' },
];

const radiusLabel = (m: number) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);

function statusLine(issue: Issue): string {
  if (issue.status === 'resolved') return issue.resolved_at ? `Fixed · ${fmtDate(issue.resolved_at)}` : 'Fixed';
  if (issue.days_open === 0) return 'Open · since today';
  return `Open · ${issue.days_open} day${issue.days_open === 1 ? '' : 's'}`;
}

/** Admins only: every issue in the selected area, open and fixed, with a close / reopen button on each. */
export default function AdminScreen() {
  const router = useRouter();
  const { colors, s } = useThemed(makeStyles);
  const { user, isAdmin } = useAuth();
  const { center, ready, radius: radiusM } = useLocationContext();
  const [filter, setFilter] = useState<Filter>('open');

  const { data, isLoading, isError, error, refetch, isRefetching } = useAreaIssues(
    ready ? center.latitude : null,
    ready ? center.longitude : null,
    radiusM,
  );
  const setStatus = useSetIssueStatus();

  const issues = useMemo(() => data ?? [], [data]);
  const counts = useMemo(
    () => ({
      open: issues.filter((i) => i.status === 'open').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
      all: issues.length,
    }),
    [issues],
  );
  const visible = filter === 'all' ? issues : issues.filter((i) => i.status === filter);

  if (!user || !isAdmin) {
    return <EmptyState icon="shield" title="Admins only" hint="Log in with an admin account to manage issues." />;
  }
  if (!ready || isLoading) return <LoadingState label="Loading issues in this area…" />;
  if (isError) {
    const status = (error as { status?: number } | null)?.status;
    if (status === 401) {
      return <ErrorState message="Your session expired. Log in again." actionLabel="Log in" onRetry={() => router.push('/login')} />;
    }
    return <ErrorState message="Couldn't load issues for this area." onRetry={() => refetch()} />;
  }

  // Status writes share a serial queue; only the row being changed shows a spinner.
  const pendingId = setStatus.isPending ? setStatus.variables?.id : undefined;

  function toggle(issue: Issue) {
    const next: Status = issue.status === 'resolved' ? 'open' : 'resolved';
    setStatus.mutate(
      { id: issue.id, status: next },
      { onError: (e) => Alert.alert('Error', e.message || 'Could not update the issue.') },
    );
  }

  const header = (
    <View style={s.header}>
      <Text style={s.label}>AREA</Text>
      <View style={s.areaRow}>
        <Icon name="pin" size={16} color={colors.accent} />
        <Text style={s.area} numberOfLines={1}>{center.label}</Text>
        <Text style={s.radius}>{radiusLabel(radiusM)}</Text>
      </View>
      <Text style={s.help}>Search a place, or change the radius in Settings, to manage another area.</Text>

      <View style={s.segment}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.option, active && s.optionActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[s.optionText, active && { color: colors.surface }]}>
                {f.label} {counts[f.key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <IssueCard
            issue={item}
            badge={statusLine(item)}
            onPress={() => router.push(`/issue/${item.id}`)}
            footer={<AdminStatusButton
              status={item.status}
              pending={pendingId === item.id}
              disabled={setStatus.isPending}
              onPress={() => toggle(item)}
            />}
          />
        )}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ paddingBottom: spacing.xl, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState icon="list" title={FILTERS.find((f) => f.key === filter)!.empty} hint="Pull down to refresh." />
        }
      />
    </View>
  );
}

const makeStyles = ({ colors, type }: ThemeValues) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line,
    },
    label: type.label,
    areaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    area: { ...type.heading, flex: 1 },
    radius: { ...type.mono, fontWeight: '800', color: colors.ink },
    help: { ...type.body, fontSize: 13 },
    segment: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    option: {
      flex: 1, height: 42, borderRadius: radius.sm, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.line,
      alignItems: 'center', justifyContent: 'center',
    },
    optionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
    optionText: { fontFamily: type.mono.fontFamily, fontWeight: '800', color: colors.ink, fontSize: 13 },
  });
