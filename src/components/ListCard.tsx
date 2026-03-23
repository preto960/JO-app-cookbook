// src/components/ListCard.tsx
// Thin card wrapper for lists, with optional header and dividers.
// Cross-platform: web, iOS, Android.
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

// ─── SectionHeader ─────────────────────────────────────────────────────────────
interface HeaderProps {
  title:         string;
  subtitle?:     string;
  rightElement?: ReactNode;
  style?:        ViewStyle;
}

export function SectionHeader({ title, subtitle, rightElement, style }: HeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {rightElement}
    </View>
  );
}

// ─── ListCard ──────────────────────────────────────────────────────────────────
interface CardProps {
  children:  ReactNode;
  style?:    ViewStyle;
  noPadding?: boolean;
}

export function ListCard({ children, style, noPadding }: CardProps) {
  const { colors } = useTheme();
  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.surface, borderColor: colors.border },
      noPadding && styles.noPadding,
      style,
    ]}>
      {children}
    </View>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ indent = SPACING.md }: { indent?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: indent }]} />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSub:   { fontSize: 12, marginTop: 2 },

  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  noPadding: {},

  divider: { height: 1 },
});
