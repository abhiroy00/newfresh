import React from 'react';
import { useFocusEffect } from 'expo-router';

type State<T> = {
  data: T;
  loading: boolean;
  error: string;
};

/**
 * Resilient async data fetching used across screens.
 *
 * - Each call is independent: one resource failing never affects another.
 * - On error it keeps the provided `fallback` so the UI is never blank.
 * - Refetches whenever the screen regains focus (kept fresh after navigation).
 * - Exposes `refetch` for manual retry / pull-to-refresh.
 *
 * @param fetcher  async function returning the resolved data
 * @param fallback value used as the initial data and on failure
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, fallback: T) {
  const [state, setState] = React.useState<State<T>>({
    data: fallback,
    loading: true,
    error: '',
  });

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const mountedRef = React.useRef(true);
  const isFetchingRef = React.useRef(false);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = React.useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setState({ data: result, loading: false, error: '' });
    } catch (e: any) {
      const msg = e?.response ? `HTTP ${e.response.status}` : e?.message || 'Network error';
      console.warn('useAsyncData error:', msg);
      if (!mountedRef.current) return;
      setState((prev) => ({ data: prev.data ?? fallback, loading: false, error: msg }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [fallback]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return { ...state, refetch, setData: (data: T) => setState((s) => ({ ...s, data })) };
}
