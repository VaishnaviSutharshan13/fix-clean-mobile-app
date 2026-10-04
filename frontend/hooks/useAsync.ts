import { useCallback, useEffect, useRef, useState } from 'react';

type AsyncState<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  // Re-runs the loader; `silent` keeps current data visible (pull-to-refresh/polling).
  reload: (silent?: boolean) => Promise<void>;
  refreshing: boolean;
};

// Loads data on mount and whenever `deps` change; ignores stale responses.
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (silent = false) => {
    const id = ++requestId.current;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) {
        setData(result);
        setError(undefined);
      }
    } catch (err) {
      if (id === requestId.current) setError(err);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload: run, refreshing };
}
