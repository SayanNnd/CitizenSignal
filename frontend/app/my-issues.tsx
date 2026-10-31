import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMyIssues } from '@/hooks/useIssues';
import { IssueCard } from '@/components/IssueCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { useThemed, type ThemeValues } from '@/theme/ThemeProvider';

export default function MyIssuesScreen() {
  const router = useRouter();
  const { s } = useThemed(makeStyles);
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyIssues();

  if (isLoading) return <LoadingState label="Loading your reports…" />;
  if (isError) {
    // 401 UNAUTHORIZED: no token or an expired one
    if ((error as { status?: number } | null)?.status === 401) {
      return <ErrorState message="Your session expired. Log in again." actionLabel="Log in" onRetry={() => router.push('/login')} />;
    }
    return <ErrorState message="Couldn't load your issues." onRetry={() => refetch()} />;
  }

  return (
    <View style={s.root}>
      <FlatList
        data={data ?? []}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <IssueCard
            issue={item}
            badge={item.my_role === 'reporter' ? 'You reported this' : 'You added a report'}
            onPress={() => router.push(`/issue/${item.id}`)}
          />
        )}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="list"
            title="No reports yet"
            hint="Issues you report, or add evidence to, show up here. Log in before reporting so your reports are linked to you."
          />
        }
      />
    </View>
  );
}

const makeStyles = ({ colors }: ThemeValues) => StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
