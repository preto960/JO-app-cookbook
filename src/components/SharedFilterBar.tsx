// src/components/SharedFilterBar.tsx
// Reusable filter bar with consistent design across all screens.
// Supports search input + chip filters. Cross-platform: web, iOS, Android.
import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

export interface FilterChip {
  label: string;
  value: string | null;
}

interface Props {
  /** Search value */
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;

  /** Chip filters — each group is a row of chips */
  chipGroups?: FilterChip[][];
  chipValues?: (string | null)[];
  onChipChange?: (groupIndex: number, value: string | null) => void;

  /** Optional right action button (e.g. "+ New") */
  actionIcon?: React.ComponentProps<typeof Ionicons>['name'];
  actionColor?: string;
  onAction?: () => void;

  /** Optional filter button */
  onFilter?: () => void;
}

export default function SharedFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  chipGroups,
  chipValues,
  onChipChange,
  actionIcon = 'add',
  actionColor,
  onAction,
  onFilter,
}: Props) {
  const { colors } = useTheme();
  const btnColor = actionColor ?? colors.primary;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Search row */}
      {onSearchChange && (
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[
                styles.searchInput,
                { color: colors.textPrimary },
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
              ]}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={searchValue}
              onChangeText={onSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!searchValue && (
              <TouchableOpacity
                onPress={() => onSearchChange('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.rightButtons}>
            {onFilter && (
              <TouchableOpacity
                style={[styles.filterBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={onFilter}
                activeOpacity={0.8}
              >
                <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {onAction && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: btnColor }]}
                onPress={onAction}
                activeOpacity={0.8}
              >
                <Ionicons name={actionIcon} size={18} color={colors.background} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Chip groups */}
      {chipGroups?.map((group, gi) => (
        <ScrollView
          key={gi}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {group.map((chip) => {
            const active = chipValues?.[gi] === chip.value;
            return (
              <TouchableOpacity
                key={String(chip.value)}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
                onPress={() => onChipChange?.(gi, chip.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: active ? colors.background : colors.textSecondary }]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    paddingBottom: SPACING.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  chip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
