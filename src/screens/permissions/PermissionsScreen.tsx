// src/screens/permissions/PermissionsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RADIUS, SPACING } from '../../constants/theme';
import ThemedCard from '../../components/ThemedCard';
import PermissionRow from '../../components/permissions/PermissionRow';
import RoleBadge from '../../components/permissions/RoleBadge';
import EmptyState from '../../components/permissions/EmptyState';

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

export type ActionType = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

export interface Permission {
  id: string;
  role: string;
  resource: ResourceType;
  resourceLabel: string;
  resourceDescription?: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isDynamic: boolean;
  displayOrder: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const ROLES = ['USER', 'ADMIN', 'DEVELOPER', 'MODERATOR'];

const RESOURCE_META: Record<ResourceType, { label: string; description: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  DASHBOARD:    { label: 'Dashboard',    description: 'Overview statistics and activity',   icon: 'grid-outline'         },
  USERS:        { label: 'Users',        description: 'User accounts management',           icon: 'people-outline'       },
  ROLES:        { label: 'Roles',        description: 'Role assignment and management',     icon: 'shield-outline'       },
  PERMISSIONS:  { label: 'Permissions',  description: 'Granular access control matrix',    icon: 'key-outline'          },
  SETTINGS:     { label: 'Settings',     description: 'System configuration and toggles',  icon: 'settings-outline'     },
  PROFILE:      { label: 'Profile',      description: 'User profile data and preferences', icon: 'person-outline'       },
  TRANSLATIONS: { label: 'Translations', description: 'i18n strings (EN / ES)',            icon: 'language-outline'     },
  RECIPE_BOOK:  { label: 'Recipe Book',  description: 'Recipes, categories and ratings',   icon: 'restaurant-outline'   },
};

function buildMockPermissions(): Permission[] {
  const resources = Object.keys(RESOURCE_META) as ResourceType[];
  const result: Permission[] = [];
  let order = 0;

  for (const role of ROLES) {
    for (const resource of resources) {
      const isAdmin = role === 'ADMIN';
      const isDev   = role === 'DEVELOPER';
      const isMod   = role === 'MODERATOR';

      result.push({
        id:                  `${role}-${resource}`,
        role,
        resource,
        resourceLabel:       RESOURCE_META[resource].label,
        resourceDescription: RESOURCE_META[resource].description,
        canView:   true,
        canCreate: isAdmin || isDev || (isMod && resource === 'RECIPE_BOOK'),
        canEdit:   isAdmin || isDev || (isMod && resource === 'RECIPE_BOOK'),
        canDelete: isAdmin,
        isDynamic: false,
        displayOrder: order++,
      });
    }
  }
  return result;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PermissionsScreen() {
  const { colors }        = useTheme();
  const { isSuperAdmin }  = useAuth();
  const toast             = useToast();

  const [permissions, setPermissions] = useState<Permission[]>(buildMockPermissions);
  const [selectedRole, setSelectedRole] = useState<string>(ROLES[0]);
  const [refreshing, setRefreshing]     = useState(false);
  const [saving, setSaving]             = useState<string | null>(null);

  const filtered = permissions.filter(p => p.role === selectedRole);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 900));
    setPermissions(buildMockPermissions());
    setRefreshing(false);
    toast.info('Permissions refreshed');
  }, [toast]);

  const toggleAction = useCallback((permId: string, action: ActionType) => {
    setPermissions(prev =>
      prev.map(p => p.id === permId ? { ...p, [action]: !p[action] } : p)
    );
  }, []);

  const saveRow = useCallback(async (permId: string) => {
    setSaving(permId);
    await new Promise(r => setTimeout(r, 700));
    setSaving(null);
    toast.success('Permission saved', 'Changes applied successfully.');
  }, [toast]);

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
          {ROLES.map(role => (
            <TouchableOpacity
              key={role}
              onPress={() => setSelectedRole(role)}
              activeOpacity={0.75}
              style={[
                styles.roleChip,
                {
                  backgroundColor: selectedRole === role ? colors.primary : colors.surfaceElevated,
                  borderColor:     selectedRole === role ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[
                styles.roleChipText,
                { color: selectedRole === role ? colors.background : colors.textSecondary },
              ]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Summary badge ── */}
      <View style={[styles.summaryBar, { backgroundColor: colors.background }]}>
        <RoleBadge role={selectedRole} />
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Permission list ── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
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
                  resourceMeta={RESOURCE_META[perm.resource]}
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

  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs },
});
