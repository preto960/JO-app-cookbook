// src/context/DataRefreshContext.tsx
// Contexto para notificar cambios en datos y refrescar listas automáticamente
import React, { createContext, useContext, useCallback, useRef, useState } from 'react';

type RefreshEvent = 'users' | 'recipes' | 'permissions' | 'shoppingLists';

interface DataRefreshContextType {
  notifyDataChange: (event: RefreshEvent) => void;
  subscribeToDataChange: (event: RefreshEvent, callback: () => void) => () => void;
  triggerRefresh: (event: RefreshEvent) => void; // Alias for notifyDataChange
  refreshKey?: Record<string, number>; // For useApiQuery dependencies
}

const DataRefreshContext = createContext<DataRefreshContextType | null>(null);

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Record<RefreshEvent, Set<() => void>>>({
    users: new Set(),
    recipes: new Set(),
    permissions: new Set(),
    shoppingLists: new Set(),
  });
  
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({
    users: 0,
    recipes: 0,
    permissions: 0,
    shoppingLists: 0,
  });

  const notifyDataChange = useCallback((event: RefreshEvent) => {
    // Increment refresh key for useApiQuery dependencies
    setRefreshKeys(prev => ({
      ...prev,
      [event]: (prev[event] || 0) + 1
    }));
    
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
    <DataRefreshContext.Provider value={{ 
      notifyDataChange, 
      subscribeToDataChange,
      triggerRefresh: notifyDataChange, // Alias
      refreshKey: refreshKeys
    }}>
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