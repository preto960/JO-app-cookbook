// src/components/RoleSelector.tsx
// Selector de rol reutilizable: carga roles desde el backend, muestra
// skeleton durante la carga y estado de error con retry.
// Compatible: web, iOS, Android.
import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useRoles } from '../hooks/useRoles';
import { SkeletonBox } from './SkeletonLoader';
import { RADIUS, SPACING } from '../constants/theme';
import type { Role } from '../types/api.types';

// ─── Icono por rol ────────────────────────────────────────────────────────────
const ROLE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  ADMIN:       'shield-checkmark-outline',
  SUPERADMIN:  'shield-checkmark',
  DEVELOPER:   'code-slash-outline',
  MODERATOR:   'eye-outline',
  USER:        'person-outline',
};

function getRoleIcon(name: string): React.ComponentProps<typeof Ionicons>['name'] {
  return ROLE_ICONS[name.toUpperCase()] ?? 'ellipse-outline';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  value:     string | null;
  onChange:  (value: string) => void;
  label?:    string;
  required?: boolean;
  /** Roles excluidos de la lista (ej: 'SUPERADMIN' si no quieres que se asigne) */
  exclude?:  string[];
  /** Deshabilitar el selector */
  disabled?: boolean;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RoleSelector({
  value,
  onChange,
  label = 'Role',
  required = false,
  exclude = [],
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const { roles, loading, error, reload } = useRoles();

  const [open, setOpen] = React.useState(false);

  const filteredRoles = roles.filter(
    (r) => !exclude.map((e) => e.toUpperCase()).includes(r.name.toUpperCase()),
  );

  const selected = filteredRoles.find(
    (r) => r.name.toUpperCase() === (value ?? '').toUpperCase(),
  );

  const handleSelect = useCallback((role: Role) => {
    onChange(role.name);
    setOpen(false);
  }, [onChange]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
          </Text>
        ) : null}
        <View
          style={[
            styles.trigger,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          <SkeletonBox width="50%" height={14} />
        </View>
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error && filteredRoles.length === 0) {
    return (
      <View style={styles.container}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
          </Text>
        ) : null}
        <View
          style={[
            styles.trigger,
            { backgroundColor: colors.surfaceElevated, borderColor: `${colors.danger}66` },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>
            Could not load roles
          </Text>
          <TouchableOpacity onPress={reload} style={styles.retryBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[styles.retryLabel, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Selector ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Label */}
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}

      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: open ? colors.primary : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !disabled && setOpen((v) => !v)}
        activeOpacity={disabled ? 1 : 0.8}
        accessibilityRole="button"
        accessibilityLabel={`Select role. Currently: ${selected?.name ?? 'none selected'}`}
      >
        {selected ? (
          <View style={styles.selectedContent}>
            <View style={[styles.roleIconWrap, { backgroundColor: colors.primaryDim }]}>
              <Ionicons
                name={getRoleIcon(selected.name)}
                size={14}
                color={colors.primary}
              />
            </View>
            <View style={styles.selectedText}>
              <Text style={[styles.roleName, { color: colors.textPrimary }]}>
                {selected.name}
              </Text>
              {selected.description ? (
                <Text style={[styles.roleDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selected.description}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <Text style={[styles.placeholder, { color: colors.textMuted }]}>
            Select a role…
          </Text>
        )}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {/* Dropdown inline — no modal, funciona dentro de ScrollView */}
      {open && !disabled && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              // Sombra multiplataforma
              ...(require('react-native').Platform.OS === 'web'
                ? { boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }
                : {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.14,
                    shadowRadius: 10,
                    elevation: 8,
                  }),
            },
          ]}
        >
          <ScrollView
            style={styles.dropdownScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredRoles.map((role, idx) => {
              const isSelected =
                role.name.toUpperCase() === (value ?? '').toUpperCase();
              const isLast = idx === filteredRoles.length - 1;

              return (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.option,
                    isSelected && { backgroundColor: colors.primaryDim },
                    !isLast && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(role)}
                  activeOpacity={0.7}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                >
                  {/* Icono */}
                  <View
                    style={[
                      styles.roleIconWrap,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getRoleIcon(role.name)}
                      size={14}
                      color={isSelected ? colors.background : colors.textSecondary}
                    />
                  </View>

                  {/* Info */}
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.roleName,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {role.name}
                    </Text>
                    {role.description ? (
                      <Text
                        style={[styles.roleDesc, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {role.description}
                      </Text>
                    ) : null}
                    {role.isSystem ? (
                      <View style={[styles.systemBadge, { backgroundColor: colors.accentDim }]}>
                        <Text style={[styles.systemBadgeText, { color: colors.accent }]}>
                          system
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Check */}
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer con info de cantidad */}
          <View style={[styles.dropdownFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''} available
            </Text>
            {error ? (
              <TouchableOpacity onPress={reload} style={styles.footerRetry}>
                <Ionicons name="refresh-outline" size={12} color={colors.warning} />
                <Text style={[styles.footerRetryText, { color: colors.warning }]}>
                  Refresh
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },

  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
  },

  selectedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedText: { flex: 1 },

  placeholder: { flex: 1, fontSize: 15 },

  errorText: { flex: 1, fontSize: 13, marginLeft: 6 },
  retryBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryLabel: { fontSize: 13, fontWeight: '600' },

  dropdown: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    maxHeight: 280,
    zIndex: 10,
  },
  dropdownScroll: { flexShrink: 1 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  optionText: { flex: 1 },

  roleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  roleName: { fontSize: 14, fontWeight: '600' },
  roleDesc: { fontSize: 11, marginTop: 1 },

  systemBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 3,
  },
  systemBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  dropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerText:      { fontSize: 11 },
  footerRetry:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerRetryText: { fontSize: 11, fontWeight: '600' },
});
