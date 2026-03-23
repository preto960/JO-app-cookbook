// src/components/EmptyState.tsx
// Displayed when a list is empty or an error occurs.
// Cross-platform: web, iOS, Android.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS } from '../constants/theme';

interface Props {
  icon?:        React.ComponentProps<typeof Ionicons>['name'];
  title:        string;
  description?: string;
  actionLabel?: string;
  onAction?:    () => void;
  /** 'error' tints the icon red */
  type?:        'empty' | 'error' | 'search';
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  type = 'empty',
}: Props) {
  const { colors } = useTheme();

  const defaultIcons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
    empty:  'file-tray-outline',
    error:  'alert-circle-outline',
    search: 'search-outline',
  };

  const resolvedIcon = icon ?? defaultIcons[type];
  const iconColor    = type === 'error' ? colors.danger : colors.textMuted;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={resolvedIcon} size={36} color={iconColor} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionLabel, { color: colors.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    gap: 12,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 17, fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 14, lineHeight: 21,
    textAlign: 'center',
  },
  actionBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  actionLabel: {
    fontSize: 14, fontWeight: '700',
  },
});
