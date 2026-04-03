// src/context/PermissionsContext.tsx
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { usePermissions as usePermissionsHook } from '../hooks/usePermissions';
import { useDataRefresh } from './DataRefreshContext';

type PermissionsContextType = ReturnType<typeof usePermissionsHook>;

const PermissionsContext = createContext<PermissionsContextType | null>(null);

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const permissions = usePermissionsHook();
  const { subscribeToDataChange } = useDataRefresh();

  // Refrescar permisos cuando hay cambios en usuarios/roles
  useEffect(() => {
    const unsubscribeUsers = subscribeToDataChange('users', () => {
      permissions.refresh();
    });

    const unsubscribePermissions = subscribeToDataChange('permissions', () => {
      permissions.refresh();
    });

    return () => {
      unsubscribeUsers();
      unsubscribePermissions();
    };
  }, [subscribeToDataChange, permissions.refresh]);

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
}

// Hook helper para casos específicos
export function useResourcePermissions(resource: string) {
  const { hasPermission, canAccess, canCreate, canEdit, canDelete, canShowInMenu } = usePermissions();
  
  return {
    canView: canAccess(resource),
    canCreate: canCreate(resource),
    canEdit: canEdit(resource),
    canDelete: canDelete(resource),
    canInMenu: canShowInMenu(resource),
    hasPermission: (action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canInMenu') => 
      hasPermission(resource, action),
  };
}