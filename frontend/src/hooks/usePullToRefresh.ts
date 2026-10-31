import { useCallback, useState } from 'react';

/**
 * State for a pull-to-refresh control. The spinner shows only while a refresh the user pulled for
 * is running, not during background refetches (moving the map, invalidation after an upvote).
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}
