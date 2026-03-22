// src/context/ToastContext.tsx
import React, {
  createContext, useContext, useState, useCallback, ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id:       string;
  type:     ToastType;
  title:    string;
  message?: string;
  duration: number;
}

interface ToastContextValue {
  toasts:      Toast[];
  showToast:   (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  // Convenience helpers
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    duration = 3500,
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, type, title, message, duration };

    setToasts(prev => {
      // Max 4 toasts at once — remove oldest if needed
      const next = prev.length >= 4 ? prev.slice(1) : prev;
      return [...next, toast];
    });

    // Auto-dismiss
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const success = useCallback((t: string, m?: string) => showToast('success', t, m), [showToast]);
  const error   = useCallback((t: string, m?: string) => showToast('error',   t, m, 5000), [showToast]);
  const warning = useCallback((t: string, m?: string) => showToast('warning', t, m, 4500), [showToast]);
  const info    = useCallback((t: string, m?: string) => showToast('info',    t, m), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
