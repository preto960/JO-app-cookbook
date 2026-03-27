// src/screens/permissions/PermissionsScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useApiCall } from '../../hooks/useApiCall';
import { userService, permissionService } from '../../services/api';
import { RADIUS, SPACING } from '../../constants/theme';
import ThemedCard from '../../components/ThemedCard';
import PermissionRow from '../../components/permissions/PermissionRow';
import RoleBadge from '../../components/permissions/RoleBadge';
import EmptyState from '../../components/permissions/EmptyState';
import type { Permission, Role } from '../../types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ResourceType =
  | 'DASHBOARD'
  | 'USERS'
  | 'ROLES'
  | 'PERMISSIONS'
  | 'SETTINGS'
  | 'PROFILE'
  | 'TRANSLATIONS'
  | 'RECIPE_BOOK';

export type ActionType = 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canInMenu';

// ─── Resource metadata ────────────────────────────────────────────────────────
const RESOURCE_META: Record<string, { label: string; description: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  DASHBOARD:    { label: 'Dashboard',    description: 'Overview statistics and activity',   icon: 'grid-outline'         },
  USERS:        { label: 'Users',        description: 'User accounts management',           icon: 'people-outline'       },
  ROLES:        { label: 'Roles',        description: 'Role assignment and management',     icon: 'shield-outline'       },
  PERMISSIONS:  { label: 'Permissions',  description: 'Granular access control matrix',    icon: 'key-outline'          },
  SETTINGS:     { label: 'Settings',     description: 'System configuration and toggles',  icon: 'settings-outline'     },
  PROFILE:      { label: 'Profile',      description: 'User profile data and preferences', icon: 'person-outline'       },
  TRANSLATIONS: { label: 'Translations', description: 'i18n strings (EN / ES)',            icon: 'language-outline'     },
  RECIPE_BOOK:  { label: 'Recipe Book',  description: 'Recipes, categories and ratings',   icon: 'restaurant-outline'   },
};


// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PermissionsScreen() {
  const { colors }        = useTheme();
  const { isSuperAdmin }  = useAuth();
  const toast             = useToast();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);

  // API calls
  const { execute: loadRoles } = useApiCall(userService.getRoles, {
    onSuccess: (data: string[] | Role[]) => {
      let rolesData: Role[] = [];
      
      try {
        // Verificar si la respuesta es string[] o Role[]
        if (Array.isArray(data) && data.length > 0) {
          if (typeof data[0] === 'string') {
            // Es string[], convertir a Role[]
            rolesData = (data as string[]).map((name, index) => ({
              id: (index + 1).toString(),
              name: String(name), // Asegurar que sea string
              description: `${name} role`,
            }));
          } else {
            // Ya es Role[], pero asegurar que name sea string
            rolesData = (data as Role[]).map(role => ({
              ...role,
              name: String(role.name || role.displayName || 'UNKNOWN'),
            }));
          }
        }
        
        setRoles(rolesData);
        if (rolesData.length > 0 && !selectedRole) {
          setSelectedRole(String(rolesData[0].name));
        }
      } catch (error) {
        console.error('Error processing roles:', error);
        toast.error('Error processing roles', 'Using fallback roles');
        
        // Fallback roles
        const fallbackRoles = [
          { id: '1', name: 'USER', description: 'Regular user' },
          { id: '2', name: 'ADMIN', description: 'Administrator' },
        ];
        setRoles(fallbackRoles);
        setSelectedRole('USER');
      }
    },
    onError: (error) => {
      toast.error('Failed to load roles', error.message);
      
      // Fallback roles en caso de error
      const fallbackRoles = [
        { id: '1', name: 'USER', description: 'Regular user' },
        { id: '2', name: 'ADMIN', description: 'Administrator' },
      ];
      setRoles(fallbackRoles);
      setSelectedRole('USER');
    },
  });

  const { execute: loadPermissions, loading: loadingPermissions } = useApiCall(permissionService.getByRole, {
    onSuccess: setPermissions,
    onError: (error) => toast.error('Failed to load permissions', error.message),
  });

  const { execute: updatePermission } = useApiCall(permissionService.update, {
    onSuccess: (updatedPermission) => {
      // Recargar permisos del rol actual
      if (selectedRole) {
        loadPermissions(selectedRole);
      }
      toast.success('Permission updated', 'Changes saved successfully.');
    },
    onError: (error) => toast.error('Failed to update permission', error.message),
  });

  const { execute: resetPermissions } = useApiCall(permissionService.reset, {
    onSuccess: () => {
      // Recargar permisos del rol actual
      if (selectedRole) {
        loadPermissions(selectedRole);
      }
      toast.success('Permissions reset', 'All permissions have been reset to default values.');
    },
    onError: (error) => toast.error('Failed to reset permissions', error.message),
  });

  // Load data on mount
  useEffect(() => {
    loadRoles();
  }, []);

  // Load permissions when role changes
  useEffect(() => {
    if (selectedRole && typeof selectedRole === 'string') {
      loadPermissions(selectedRole);
    }
  }, [selectedRole, loadPermissions]);

  const filtered = permissions.filter(p => p.role === selectedRole);

  // Verificar que selectedRole no sea un objeto
  React.useEffect(() => {
    if (selectedRole && typeof selectedRole === 'object') {
      console.error('selectedRole is an object:', selectedRole);
      // Si selectedRole es un objeto, extraer el name
      const roleName = (selectedRole as any).name || (selectedRole as any).displayName || 'USER';
      setSelectedRole(roleName);
    }
  }, [selectedRole]);

  const onRefresh = useCallback(async () => {
    if (selectedRole) {
      await loadPermissions(selectedRole);
      toast.info('Permissions refreshed');
    }
  }, [selectedRole, loadPermissions, toast]);

  const toggleAction = useCallback((permId: string, action: ActionType) => {
    setPermissions(prev =>
      prev.map(p => p.id === permId ? { ...p, [action]: !p[action] } : p)
    );
  }, []);

  const saveRow = useCallback(async (permId: string) => {
    const permission = permissions.find(p => p.id === permId);
    if (!permission) return;

    setSaving(permId);
    
    const payload = {
      role: permission.role,
      resource: permission.resource,
      canView: permission.canView,
      canCreate: permission.canCreate,
      canEdit: permission.canEdit,
      canDelete: permission.canDelete,
      canInMenu: permission.canInMenu,
    };

    await updatePermission(payload);
    setSaving(null);
  }, [permissions, updatePermission]);

  const handleResetPermissions = useCallback(() => {
    Alert.alert(
      'Reset Permissions',
      'This will reset ALL permissions to their default values. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive', 
          onPress: () => resetPermissions()
        },
      ]
    );
  }, [resetPermissions]);

  if (!isSuperAdmin) {
    return (
      <View style={[styles.blocked, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>Access Restricted</Text>
        <Text style={[styles.blockedSub, { color: colors.textSecondary }]}>
          This panel is only available to the Super Admin.
        </Text>
      </View>
    );
  }

  // No renderizar hasta que tengamos un rol válido
  if (!selectedRole || typeof selectedRole !== 'string') {
    return (
      <View style={[styles.blocked, { backgroundColor: colors.background }]}>
        <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* ── Role selector — no reset button ── */}
      <View style={[styles.roleBar, {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roleBarContent}
        >
          {roles.map(role => (
            <TouchableOpacity
              key={role.id}
              onPress={() => setSelectedRole(role.name)}
              activeOpacity={0.75}
              style={[
                styles.roleChip,
                {
                  backgroundColor: selectedRole === role.name ? colors.primary : colors.surfaceElevated,
                  borderColor:     selectedRole === role.name ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[
                styles.roleChipText,
                { color: selectedRole === role.name ? colors.background : colors.textSecondary },
              ]}>
                {role.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Summary badge ── */}
      <View style={[styles.summaryBar, { backgroundColor: colors.background }]}>
        <RoleBadge role={selectedRole || 'USER'} />
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          onPress={handleResetPermissions}
          style={[styles.resetBtn, { backgroundColor: colors.dangerDim }]}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={14} color={colors.danger} />
          <Text style={[styles.resetBtnText, { color: colors.danger }]}>Reset All</Text>
        </TouchableOpacity>
      </View>

      {/* ── Permission list ── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={loadingPermissions}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filtered.length === 0 ? (
          <EmptyState message={`No permissions found for ${selectedRole}`} />
        ) : (
          <ThemedCard>
            {filtered
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((perm, idx) => (
                <PermissionRow
                  key={perm.id}
                  permission={perm}
                  isLast={idx === filtered.length - 1}
                  isSaving={saving === perm.id}
                  resourceMeta={RESOURCE_META[perm.resource] || { 
                    label: perm.resourceLabel || perm.resource, 
                    description: perm.resourceDescription || '', 
                    icon: 'document-outline' as any 
                  }}
                  onToggle={toggleAction}
                  onSave={saveRow}
                />
              ))
            }
          </ThemedCard>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  blocked: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl, gap: SPACING.sm,
  },
  blockedTitle: { fontSize: 20, fontWeight: '800' },
  blockedSub:   { fontSize: 14, textAlign: 'center', marginTop: 4 },

  roleBar: {
    borderBottomWidth: 1,
  },
  roleBarContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  roleChipText: { fontSize: 12, fontWeight: '700' },

  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  summaryText: { fontSize: 12 },

  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  resetBtnText: { fontSize: 11, fontWeight: '600' },

  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs },
});
