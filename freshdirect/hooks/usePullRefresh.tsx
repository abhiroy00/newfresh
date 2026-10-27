import React from 'react';
import { RefreshControl } from 'react-native';
import { Colors } from '@/constants/theme';

/**
 * Pull-to-refresh for a ScrollView/FlatList.
 *
 * Usage: `const { refreshControl } = usePullRefresh(reload);` then pass
 * `refreshControl={refreshControl}` to the scroll view.
 */
export function usePullRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = React.useState(false);
  const refreshRef = React.useRef(onRefresh);
  refreshRef.current = onRefresh;

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshRef.current();
    } catch (e) {
      console.warn('Refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[Colors.primary]}
      tintColor={Colors.primary}
    />
  );

  return { refreshing, refreshControl };
}
