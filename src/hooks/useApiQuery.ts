// src/hooks/useApiQuery.ts
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiQueryOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
  refetchOnMount?: boolean;
}

interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Set cache data locally (e.g. optimistic updates) without refetching */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApiQuery<T>(
  queryFn: () => Promise<T>,
  deps: any[] = [],
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const { onSuccess, onError, enabled = true, refetchOnMount = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);
  const callIdRef = useRef(0);
  const queryFnRef = useRef(queryFn);

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const execute = useCallback(async () => {
    if (!enabled) return;
    
    const callId = ++callIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await queryFnRef.current();

      if (!mountedRef.current || callId !== callIdRef.current) {
        return;
      }

      setData(result);
      onSuccess?.(result);
    } catch (err: any) {
      console.error('useApiQuery: query failed', err);
      
      if (!mountedRef.current || callId !== callIdRef.current) return;
      
      const message = err?.response?.data?.message || err?.message || 'Query failed';
      setError(message);
      onError?.(message);
    } finally {
      if (mountedRef.current && callId === callIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, onError, onSuccess]);

  useEffect(() => {
    if (refetchOnMount) {
      execute();
    }
  // intentionally not depending on `execute` to avoid re-fetch loops
  // when queryFn is recreated on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchOnMount, ...deps]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: execute,
    setData,
  };
}