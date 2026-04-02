// src/context/DebugContext.tsx
import React, {
  createContext, useContext, useState, useCallback, useEffect, ReactNode,
} from 'react';
import { Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HttpLog {
  id:        string;
  method:    string;
  url:       string;
  status?:   number;
  duration?: number;
  error?:    string;
  timestamp: number;
}

export interface ErrorLog {
  id:        string;
  message:   string;
  stack?:    string;
  timestamp: number;
}

export interface CustomLog {
  id:        string;
  level:     'log' | 'warn' | 'error';
  message:   string;
  timestamp: number;
}

interface DebugContextValue {
  httpLogs:      HttpLog[];
  errorLogs:     ErrorLog[];
  customLogs:    CustomLog[];
  logRequest:    (log: Omit<HttpLog, 'id' | 'timestamp'>) => string;
  updateRequest: (id: string, update: Partial<HttpLog>) => void;
  log:           (message: string) => void;
  warn:          (message: string) => void;
  logError:      (message: string, stack?: string) => void;
  clearAll:      () => void;
}

const DebugContext = createContext<DebugContextValue | null>(null);

const MAX = 100;

// ─── Provider ─────────────────────────────────────────────────────────────────
export function DebugProvider({ children }: { children: ReactNode }) {
  const [httpLogs,   setHttpLogs]   = useState<HttpLog[]>([]);
  const [errorLogs,  setErrorLogs]  = useState<ErrorLog[]>([]);
  const [customLogs, setCustomLogs] = useState<CustomLog[]>([]);

  const addError = useCallback((message: string, stack?: string) => {
    const entry: ErrorLog = { id: `${Date.now()}-${Math.random()}`, message, stack, timestamp: Date.now() };
    setErrorLogs(prev => [entry, ...prev].slice(0, MAX));
  }, []);

  // ── Global error capture ──────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // React Native — use ErrorUtils
      // Dynamically require so web bundler doesn't choke on it
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ErrorUtils } = require('react-native') as any;
        if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
          const prev = ErrorUtils.getGlobalHandler();
          ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
            addError(`${isFatal ? '[FATAL] ' : ''}${error?.message ?? String(error)}`, error?.stack);
            prev(error, isFatal);
          });
          return () => ErrorUtils.setGlobalHandler(prev);
        }
      } catch {
        // silently ignore if ErrorUtils is unavailable
      }
    } else {
      // Web — use window.onerror + unhandledrejection
      const w = globalThis as typeof globalThis & {
        addEventListener: Window['addEventListener'];
        removeEventListener: Window['removeEventListener'];
      };
      const onError = (event: Event) => {
        const e = event as ErrorEvent;
        addError(e.message ?? 'Unknown error', e.error?.stack);
      };
      const onUnhandled = (event: Event) => {
        const ev = event as { reason?: { message?: string; stack?: string } };
        const r = ev.reason;
        const msg = r?.message ?? String(r ?? 'Unhandled promise rejection');
        addError(msg, r?.stack);
      };
      w.addEventListener('error', onError);
      w.addEventListener('unhandledrejection', onUnhandled);
      return () => {
        w.removeEventListener('error', onError);
        w.removeEventListener('unhandledrejection', onUnhandled);
      };
    }
  }, [addError]);

  // ── HTTP logging ──────────────────────────────────────────────────────────
  const logRequest = useCallback((log: Omit<HttpLog, 'id' | 'timestamp'>): string => {
    const id = `${Date.now()}-${Math.random()}`;
    setHttpLogs(prev => [{ ...log, id, timestamp: Date.now() }, ...prev].slice(0, MAX));
    return id;
  }, []);

  const updateRequest = useCallback((id: string, update: Partial<HttpLog>) => {
    setHttpLogs(prev => prev.map(l => l.id === id ? { ...l, ...update } : l));
  }, []);

  // ── Custom logs ───────────────────────────────────────────────────────────
  const log = useCallback((message: string) => {
    setCustomLogs(prev => [{ id: `${Date.now()}`, level: 'log' as const, message, timestamp: Date.now() }, ...prev].slice(0, MAX));
  }, []);

  const warn = useCallback((message: string) => {
    setCustomLogs(prev => [{ id: `${Date.now()}`, level: 'warn' as const, message, timestamp: Date.now() }, ...prev].slice(0, MAX));
  }, []);

  const logError = useCallback((message: string, stack?: string) => {
    addError(message, stack);
  }, [addError]);

  const clearAll = useCallback(() => {
    setHttpLogs([]);
    setErrorLogs([]);
    setCustomLogs([]);
  }, []);

  return (
    <DebugContext.Provider value={{
      httpLogs, errorLogs, customLogs,
      logRequest, updateRequest,
      log, warn, logError, clearAll,
    }}>
      {children}
    </DebugContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDebug(): DebugContextValue {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error('useDebug must be used within DebugProvider');
  return ctx;
}
