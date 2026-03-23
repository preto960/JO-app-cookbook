// src/components/permissions/PermissionRow.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING } from '../../constants/theme';
import type { Permission, ActionType, ResourceType } from '../../screens/permissions/PermissionsScreen';

interface ResourceMeta {
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

interface Props {
  permission: Permission;
  isLast: boolean;
  isSaving: boolean;
  resourceMeta: ResourceMeta;
  onToggle: (permId: string, action: ActionType) => void;
  onSave:   (permId: string) => void;
}

const ACTIONS: { key: ActionType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'canView',   label: 'View',   icon: 'eye-outline'      },
  { key: 'canCreate', label: 'Create', icon: 'add-circle-outline'},
  { key: 'canEdit',   label: 'Edit',   icon: 'pencil-outline'   },
  { key: 'canDelete', label: 'Delete', icon: 'trash-outline'    },
];

export default function PermissionRow({
  permission, isLast, isSaving, resourceMeta, onToggle, onSave,
}: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const hasAnyPermission =
    permission.canView || permission.canCreate ||
    permission.canEdit || permission.canDelete;

  return (
    <View style={[
      styles.container,
      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
      {/* ── Header row ── */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(v => !v)}
        style={styles.header}
      >
        {/* Icon + text */}
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name={resourceMeta.icon} size={16} color={colors.primary} />
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.resourceLabel, { color: colors.textPrimary }]}>
            {resourceMeta.label}
          </Text>
          <Text style={[styles.resourceDesc, { color: colors.textSecondary }]} numberOfLines={1}>
            {resourceMeta.description}
          </Text>
        </View>

        {/* Quick summary chips */}
        <View style={styles.chipRow}>
          {ACTIONS.map(a => (
            permission[a.key] ? (
              <View key={a.key} style={[styles.summaryChip, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name={a.icon} size={10} color={colors.primary} />
              </View>
            ) : null
          ))}
          {!hasAnyPermission && (
            <View style={[styles.summaryChip, { backgroundColor: `${colors.danger}22` }]}>
              <Ionicons name="ban-outline" size={10} color={colors.danger} />
            </View>
          )}
        </View>

        <Ionicons
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={16}
          color={colors.textMuted}
          style={styles.chevron}
        />
      </TouchableOpacity>

      {/* ── Expanded toggle matrix ── */}
      {expanded && (
        <View style={[styles.matrix, { backgroundColor: colors.surfaceElevated, borderRadius: RADIUS.md }]}>
          <View style={styles.matrixRow}>
            {ACTIONS.map(action => {
              const active = permission[action.key];
              return (
                <TouchableOpacity
                  key={action.key}
                  onPress={() => onToggle(permission.id, action.key)}
                  activeOpacity={0.7}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: active
                        ? (action.key === 'canDelete' ? `${colors.danger}22` : colors.primaryDim)
                        : colors.surface,
                      borderColor: active
                        ? (action.key === 'canDelete' ? colors.danger : colors.primary)
                        : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={action.icon}
                    size={14}
                    color={active
                      ? (action.key === 'canDelete' ? colors.danger : colors.primary)
                      : colors.textMuted
                    }
                  />
                  <Text style={[
                    styles.actionLabel,
                    {
                      color: active
                        ? (action.key === 'canDelete' ? colors.danger : colors.primary)
                        : colors.textMuted,
                    },
                  ]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={() => onSave(permission.id)}
            disabled={isSaving}
            activeOpacity={0.8}
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 },
              Platform.OS === 'web' && ({ boxShadow: `0 2px 8px ${colors.primary}44` } as any),
            ]}
          >
            {isSaving
              ? <ActivityIndicator size="small" color={colors.background} />
              : (
                <>
                  <Ionicons name="checkmark-outline" size={14} color={colors.background} />
                  <Text style={[styles.saveBtnText, { color: colors.background }]}>Save</Text>
                </>
              )
            }
          </TouchableOpacity>

          {/* Dynamic tag */}
          {permission.isDynamic && (
            <View style={[styles.dynamicBadge, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="extension-puzzle-outline" size={10} color={colors.accent} />
              <Text style={[styles.dynamicText, { color: colors.accent }]}>Plugin permission</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: SPACING.sm },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
  },

  iconWrap: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  headerText: { flex: 1 },
  resourceLabel: { fontSize: 14, fontWeight: '600' },
  resourceDesc:  { fontSize: 11, marginTop: 1 },

  chipRow: { flexDirection: 'row', gap: 3, flexShrink: 0 },
  summaryChip: {
    width: 18, height: 18, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },

  chevron: { flexShrink: 0 },

  matrix: {
    marginTop: SPACING.xs,
    marginHorizontal: SPACING.xs,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },

  matrixRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  actionBtn: {
    flex: 1,
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 11, fontWeight: '600' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700' },

  dynamicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginTop: 2,
  },
  dynamicText: { fontSize: 10, fontWeight: '600' },
});
