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
  const { data, isLoading, isError, refetch, isRefetching } = useMyIssues();

  if (isLoading) return <LoadingState label="Loading your reports…" />;
  if (isError) return <ErrorState message="Couldn't load your issues." onRetry={() => refetch()} />;

  return (
    <View style={s.root}>
      <FlatList
        data={data ?? []}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => router.push(`/issue/${item.id}`)} />}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState icon="list" title="No reports yet" hint="Issues you report will show up here so you can follow their progress." />
        }
      />
    </View>
  );
}

const makeStyles = ({ colors }: ThemeValues) => StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
