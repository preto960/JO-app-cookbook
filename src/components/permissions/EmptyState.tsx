// src/components/permissions/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/theme';

interface Props {
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export default function EmptyState({
  message,
  icon = 'document-text-outline',
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  message: { fontSize: 14, textAlign: 'center' },
});
