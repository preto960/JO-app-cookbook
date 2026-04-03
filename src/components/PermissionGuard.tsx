// src/components/PermissionGuard.tsx
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  resource: string;
  action?: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canInMenu';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

export function PermissionGuard({ 
  resource, 
  action = 'canView', 
  children, 
  fallback = null,
  showLoading = false
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();

  // Mostrar loading si está configurado y aún cargando
  if (loading && showLoading) {
    return <>{fallback}</>;
  }

  // Si no tiene permisos, mostrar fallback (null por defecto = ocultar)
  if (!hasPermission(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Componente helper para casos comunes
interface PermissionButtonProps {
  resource: string;
  action: 'canCreate' | 'canEdit' | 'canDelete';
  children: React.ReactNode;
}

export function PermissionButton({ resource, action, children }: PermissionButtonProps) {
  return (
    <PermissionGuard resource={resource} action={action}>
      {children}
    </PermissionGuard>
  );
}

// Componente helper para menús
interface PermissionMenuItemProps {
  resource: string;
  children: React.ReactNode;
}

export function PermissionMenuItem({ resource, children }: PermissionMenuItemProps) {
  return (
    <PermissionGuard resource={resource} action="canInMenu">
      {children}
    </PermissionGuard>
  );
}