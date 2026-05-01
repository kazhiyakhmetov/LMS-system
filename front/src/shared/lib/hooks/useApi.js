import { useCallback, useEffect, useRef, useState } from "react";

export function useApi(fetcher, deps = [], options = {}) {
  const { immediate = true, onSuccess, onError } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    const id = ++requestIdRef.current;
    if (mountedRef.current) setLoading(true);
    setError(null);
    try {
      const result = await fetcher(...args);
      if (mountedRef.current && requestIdRef.current === id) {
        setData(result);
        onSuccess?.(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current && requestIdRef.current === id) {
        setError(err);
        onError?.(err);
      }
      throw err;
    } finally {
      if (mountedRef.current && requestIdRef.current === id) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!immediate) return;
    run().catch(() => { /* state уже обновлён */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run, setData };
}
