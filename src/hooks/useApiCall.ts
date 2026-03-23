// src/hooks/useApiCall.ts
// Generic hook that wraps any async API call with loading, error, and data state.
// Works on web, iOS, and Android. No external dependencies.
import { useState, useCallback, useRef } from 'react';

export interface ApiCallState<T> {
  data:      T | null;
  loading:   boolean;
  error:     string | null;
  execute:   (...args: any[]) => Promise<T | null>;
  reset:     () => void;
  setData:   (data: T | null) => void;
}

/**
 * @example
 * const { data, loading, error, execute } = useApiCall(userService.getAll);
 * useEffect(() => { execute({ page: 1 }); }, []);
 */
export function useApiCall<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?:   (error: string) => void;
    initialData?: T;
  }
): ApiCallState<T> {
  const [data,    setData]    = useState<T | null>(options?.initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Prevent state updates on unmounted component
  const mountedRef = useRef(true);
  // Track latest call to discard stale responses
  const callIdRef  = useRef(0);

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    const callId = ++callIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      if (!mountedRef.current || callId !== callIdRef.current) return null;
      setData(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err: any) {
      if (!mountedRef.current || callId !== callIdRef.current) return null;
      const message = extractErrorMessage(err);
      setError(message);
      options?.onError?.(message);
      return null;
    } finally {
      if (mountedRef.current && callId === callIdRef.current) {
        setLoading(false);
      }
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(options?.initialData ?? null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, execute, reset, setData };
}

// ─── Helper: extract readable message from Axios/network errors ───────────────
export function extractErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  // Axios response error
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response?.data?.error)   return err.response.data.error;
  // Network / timeout
  if (err?.code === 'ECONNABORTED')  return 'Request timed out. Check your connection.';
  if (!err?.response)                return 'Network error. Check your connection or API URL.';
  // HTTP status fallbacks
  const status = err?.response?.status;
  if (status === 400) return 'Invalid data. Check the form fields.';
  if (status === 401) return 'Unauthorized. Please sign in again.';
  if (status === 403) return 'You do not have permission for this action.';
  if (status === 404) return 'Resource not found.';
  if (status === 409) return 'Conflict: this record already exists.';
  if (status >= 500)  return `Server error (${status}). Try again later.`;
  return err?.message ?? 'Something went wrong.';
}
