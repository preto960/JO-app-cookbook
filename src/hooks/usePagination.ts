// src/hooks/usePagination.ts
// Hook for paginated API calls with optional search/filter params.
// Cross-platform: web, iOS, Android.
import { useState, useCallback, useRef } from 'react';
import { extractErrorMessage } from './useApiCall';
import type { PaginatedResponse } from '../types/api.types';

interface PaginationOptions<T, P> {
  apiFunction: (params: P & { page: number; limit: number }) => Promise<PaginatedResponse<T>>;
  initialParams?: Partial<P>;
  pageSize?: number;
  onError?: (message: string) => void;
}

interface PaginationState<T> {
  items:       T[];
  loading:     boolean;
  loadingMore: boolean;
  error:       string | null;
  page:        number;
  totalPages:  number;
  total:       number;
  hasMore:     boolean;
  // Actions
  loadPage:         (page: number) => Promise<void>;
  loadMore:         () => Promise<void>;
  refresh:          () => Promise<void>;
  refreshWithParams: (params: Partial<P>) => Promise<void>;
  setParams:        (params: any) => Promise<Partial<P>>;
  reset:            () => void;
}

/**
 * @example
 * const { items, loading, loadMore, refresh, setParams } = usePagination({
 *   apiFunction: userService.getAll,
 *   pageSize: 20,
 * });
 * // Filter by search
 * setParams({ search: 'john' });
 */
export function usePagination<T, P extends object = object>(
  options: PaginationOptions<T, P>
): PaginationState<T> {
  const { apiFunction, initialParams = {}, pageSize = 20, onError } = options;

  const [items,       setItems]       = useState<T[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [params,      setParamsState] = useState<Partial<P>>(initialParams);

  const mountedRef = useRef(true);
  const callIdRef  = useRef(0);

  const fetchPage = useCallback(async (targetPage: number, append: boolean, customParams?: Partial<P>) => {
    const callId = ++callIdRef.current;
    if (append) setLoadingMore(true);
    else        setLoading(true);
    setError(null);

    try {
      const paramsToUse = customParams || params;
      const finalParams = {
        ...paramsToUse,
        page:  targetPage,
        limit: pageSize,
      } as P & { page: number; limit: number };
      
      const result = await apiFunction(finalParams);

      if (!mountedRef.current || callId !== callIdRef.current) return;

      setItems(prev => append ? [...prev, ...result.data] : result.data);
      setPage(result.page ?? targetPage);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? result.data.length);
    } catch (err: any) {
      if (!mountedRef.current || callId !== callIdRef.current) return;
      const msg = extractErrorMessage(err);
      setError(msg);
      onError?.(msg);
    } finally {
      if (mountedRef.current && callId === callIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [apiFunction, params, pageSize]);

  const loadPage = useCallback((p: number) => fetchPage(p, false), [fetchPage]);
  const refresh  = useCallback(() => fetchPage(1, false), [fetchPage]);
  const refreshWithParams = useCallback((customParams: Partial<P>) => fetchPage(1, false, customParams), [fetchPage]);
  const loadMore = useCallback(() => {
    if (loadingMore || loading || page >= totalPages) return Promise.resolve();
    return fetchPage(page + 1, true);
  }, [fetchPage, loading, loadingMore, page, totalPages]);

  const setParams = useCallback(async (newParams: Partial<P>) => {
    return new Promise<Partial<P>>((resolve) => {
      setParamsState(prev => {
        const mergedParams = { ...prev, ...newParams };
        
        // Reset to page 1 on param change
        setPage(1);
        setItems([]);
        setTotalPages(1);
        setTotal(0);
        
        // Resolve with the merged params
        setTimeout(() => resolve(mergedParams), 0);
        
        return mergedParams;
      });
    });
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setLoading(false);
    setLoadingMore(false);
    setError(null);
    setPage(1);
    setTotalPages(1);
    setTotal(0);
    setParamsState(initialParams);
  }, [initialParams]);

  return {
    items, loading, loadingMore, error,
    page, totalPages, total,
    hasMore: page < totalPages,
    loadPage, loadMore, refresh, refreshWithParams, setParams, reset,
  };
}
