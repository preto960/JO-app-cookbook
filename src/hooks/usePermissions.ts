// src/hooks/usePermissions.ts
import { useState, useEffect, useCallback } from 'react';
import { permissionService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Permission } from '../types/api.types';

interface UsePermissionsReturn {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  hasPermission: (resource: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canInMenu') => boolean;
  canAccess: (resource: string) => boolean;
  canCreate: (resource: string) => boolean;
  canEdit: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canShowInMenu: (resource: string) => boolean;
  refresh: () => void;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    // Solo cargar permisos si el usuario está autenticado
    if (!user) {
      setPermissions([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userPermissions = await permissionService.getMyPermissions();
      setPermissions(userPermissions);
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError('Failed to load permissions');
      // En caso de error, asumimos sin permisos por seguridad
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Solo ejecutar si no estamos cargando la autenticación
    if (!authLoading) {
      loadPermissions();
    }
  }, [loadPermissions, authLoading]);

  const hasPermission = useCallback((resource: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canInMenu'): boolean => {
    const permission = permissions.find(p => p.resource === resource);
    return permission?.[action] ?? false;
  }, [permissions]);

  const canAccess = useCallback((resource: string) => hasPermission(resource, 'canView'), [hasPermission]);
  const canCreate = useCallback((resource: string) => hasPermission(resource, 'canCreate'), [hasPermission]);
  const canEdit = useCallback((resource: string) => hasPermission(resource, 'canEdit'), [hasPermission]);
  const canDelete = useCallback((resource: string) => hasPermission(resource, 'canDelete'), [hasPermission]);
  const canShowInMenu = useCallback((resource: string) => hasPermission(resource, 'canInMenu'), [hasPermission]);

  return {
    permissions,
    loading: authLoading || loading, // Considerar tanto auth loading como permissions loading
    error,
    hasPermission,
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    canShowInMenu,
    refresh: loadPermissions,
  };
}