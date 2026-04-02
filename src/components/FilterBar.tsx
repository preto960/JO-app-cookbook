// src/components/FilterBar.tsx
// Horizontal scrollable row of filter chips.
// Cross-platform: web, iOS, Android.
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

export interface FilterOption {
  label: string;
  value: string;
}

interface Props {
  options:  FilterOption[];
  value:    string | null;
  onChange: (value: string | null) => void;
}

export default function FilterBar({ options, value, onChange }: Props) {
  const { colors } = useTheme();

  const chips = options;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((opt, index) => {
        const active = opt.value === '' ? !value : value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value || `filter-${index}`}
            style={[
              styles.chip,
              active
                ? { backgroundColor: colors.primary,     borderColor: colors.primary }
                : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
            onPress={() => onChange(opt.value === '' ? null : opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.label,
              { color: active ? colors.background : colors.textSecondary },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  label: {
    fontSize: 13, fontWeight: '600',
  },
});
