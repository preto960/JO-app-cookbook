// src/context/DataRefreshContext.tsx
// Contexto para notificar cambios en datos y refrescar listas automáticamente
import React, { createContext, useContext, useCallback, useRef } from 'react';

type RefreshEvent = 'users' | 'recipes' | 'permissions';

interface DataRefreshContextType {
  notifyDataChange: (event: RefreshEvent) => void;
  subscribeToDataChange: (event: RefreshEvent, callback: () => void) => () => void;
}

const DataRefreshContext = createContext<DataRefreshContextType | null>(null);

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Record<RefreshEvent, Set<() => void>>>({
    users: new Set(),
    recipes: new Set(),
    permissions: new Set(),
  });

  const notifyDataChange = useCallback((event: RefreshEvent) => {
    const listeners = listenersRef.current[event];
    listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error(`Error in data refresh callback for ${event}:`, error);
      }
    });
  }, []);

  const subscribeToDataChange = useCallback((event: RefreshEvent, callback: () => void) => {
    const listeners = listenersRef.current[event];
    listeners.add(callback);

    // Retornar función de cleanup
    return () => {
      listeners.delete(callback);
    };
  }, []);

  return (
    <DataRefreshContext.Provider value={{ notifyDataChange, subscribeToDataChange }}>
      {children}
    </DataRefreshContext.Provider>
  );
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider');
  }
  return context;
}

// Hook específico para usuarios
export function useUsersRefresh() {
  const { notifyDataChange, subscribeToDataChange } = useDataRefresh();

  const notifyUsersChanged = useCallback(() => {
    notifyDataChange('users');
  }, [notifyDataChange]);

  const subscribeToUsersChange = useCallback((callback: () => void) => {
    return subscribeToDataChange('users', callback);
  }, [subscribeToDataChange]);

  return { notifyUsersChanged, subscribeToUsersChange };
}