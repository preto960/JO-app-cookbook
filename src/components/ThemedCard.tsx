// src/components/ThemedCard.tsx
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

interface Props {
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
  /** Visually distinct danger variant */
  danger?: boolean;
}

/**
 * A themed surface card used across screens.
 * Reads colors from ThemeContext so it adapts to light/dark automatically.
 */
export default function ThemedCard({ title, children, style, danger = false }: Props) {
  const { colors } = useTheme();

  const cardBg     = danger ? '#EF444408' : colors.surface;
  const cardBorder = danger ? `${colors.danger}44` : colors.border;
  const titleColor = danger ? colors.danger : colors.textSecondary;
  const titleBorder = danger ? `${colors.danger}33` : colors.border;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, style]}>
      {title ? (
        <Text style={[styles.cardTitle, { color: titleColor, borderBottomColor: titleBorder }]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
});
