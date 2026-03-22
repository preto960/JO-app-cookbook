// src/components/SettingRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/theme';

interface Props {
  label: string;
  description?: string;
  info?: string;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  type?: 'toggle' | 'button' | 'info';
  danger?: boolean;
}

/**
 * A single settings row supporting toggle, button, and info variants.
 * Reads colors from ThemeContext internally.
 */
export default function SettingRow({
  label, description, info,
  value, onToggle, onPress,
  type = 'toggle', danger = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={type === 'toggle' || type === 'info'}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={[styles.label, { color: danger ? colors.danger : colors.textPrimary }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>
        )}
        {info && (
          <Text style={[styles.info, { color: colors.primary, backgroundColor: colors.primaryDim }]}>
            {info}
          </Text>
        )}
      </View>

      {type === 'toggle' && onToggle && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={value ? colors.background : colors.textSecondary}
        />
      )}
      {type === 'button' && (
        <Text style={[styles.chevron, { color: danger ? colors.danger : colors.textSecondary }]}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  left: { flex: 1, paddingRight: SPACING.md },
  label: { fontSize: 15, fontWeight: '500' },
  desc:  { fontSize: 12, marginTop: 2 },
  info:  { fontSize: 11, marginTop: 4, padding: 4, borderRadius: 4 },
  chevron: { fontSize: 22, fontWeight: '300' },
});
