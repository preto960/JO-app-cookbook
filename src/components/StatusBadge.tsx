// src/components/StatusBadge.tsx
// Displays a colored pill badge for roles, statuses, difficulty levels, etc.
// Cross-platform: web, iOS, Android.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS } from '../constants/theme';

export type BadgeVariant =
  | 'success' | 'danger' | 'warning' | 'info'
  | 'primary' | 'secondary' | 'admin' | 'neutral';

interface Props {
  label?: string | null;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  /** Auto-pick variant from common keywords */
  auto?: boolean;
}

const AUTO_VARIANTS: Record<string, BadgeVariant> = {
  // Status
  active:    'success',
  enabled:   'success',
  published: 'success',
  true:      'success',
  inactive:  'danger',
  disabled:  'danger',
  deleted:   'danger',
  false:     'danger',
  pending:   'warning',
  draft:     'warning',
  // Roles
  superadmin: 'admin',
  admin:      'admin',
  developer:  'info',
  dev:        'info',
  user:       'neutral',
  // Difficulty
  easy:    'success',
  medium:  'warning',
  hard:    'danger',
};

function autoVariant(label: string): BadgeVariant {
  const key = (label ?? '').toLowerCase();
  return AUTO_VARIANTS[key] ?? 'neutral';
}

export default function StatusBadge({ label, variant, size = 'md', auto = false }: Props) {
  const { colors } = useTheme();
  const safeLabel = label ?? '';
  const resolved: BadgeVariant = variant ?? (auto ? autoVariant(safeLabel) : 'neutral');

  const { bg, text } = getColors(resolved, colors);
  const isSmall = size === 'sm';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: bg },
      isSmall ? styles.small : styles.medium,
    ]}>
      <Text style={[
        styles.label,
        { color: text },
        isSmall ? styles.labelSm : styles.labelMd,
      ]} numberOfLines={1}>
        {safeLabel || '—'}
      </Text>
    </View>
  );
}

function getColors(variant: BadgeVariant, colors: any): { bg: string; text: string } {
  switch (variant) {
    case 'success':   return { bg: `${colors.success}22`,    text: colors.success };
    case 'danger':    return { bg: `${colors.danger}22`,     text: colors.danger };
    case 'warning':   return { bg: `${colors.warning}22`,    text: colors.warning };
    case 'info':      return { bg: `${colors.primary}22`,    text: colors.primary };
    case 'primary':   return { bg: colors.primaryDim,        text: colors.primary };
    case 'admin':     return { bg: colors.adminGoldDim,      text: colors.adminGold };
    case 'secondary': return { bg: `${colors.accent}22`,     text: colors.accent };
    case 'neutral':
    default:          return { bg: colors.surfaceElevated,   text: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  small:   { paddingHorizontal: 6,  paddingVertical: 2 },
  medium:  { paddingHorizontal: 10, paddingVertical: 4 },
  label:   { fontWeight: '700', textTransform: 'capitalize' },
  labelSm: { fontSize: 10 },
  labelMd: { fontSize: 12 },
});
