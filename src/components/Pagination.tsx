// src/components/Pagination.tsx
// Page navigation controls for paginated lists.
// Cross-platform: web, iOS, Android.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

interface Props {
  page:       number;
  totalPages: number;
  total:      number;
  loading?:   boolean;
  onPage:     (page: number) => void;
}

export default function Pagination({ page, totalPages, total, loading, onPage }: Props) {
  const { colors } = useTheme();

  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Build visible page numbers (max 5 visible)
  const pages: (number | '...')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3)       pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.info, { color: colors.textSecondary }]}>
        {total} result{total !== 1 ? 's' : ''}
      </Text>
      <View style={styles.controls}>
        <PageBtn
          icon="chevron-back"
          disabled={!canPrev || loading}
          onPress={() => onPage(page - 1)}
          colors={colors}
        />
        {pages.map((p, i) =>
          p === '...'
            ? <Text key={`dots-${i}`} style={[styles.dots, { color: colors.textMuted }]}>…</Text>
            : <PageNumber
                key={p}
                num={p}
                active={p === page}
                disabled={loading}
                onPress={() => onPage(p)}
                colors={colors}
              />
        )}
        <PageBtn
          icon="chevron-forward"
          disabled={!canNext || loading}
          onPress={() => onPage(page + 1)}
          colors={colors}
        />
      </View>
    </View>
  );
}

function PageBtn({ icon, disabled, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={16} color={disabled ? colors.textMuted : colors.textSecondary} />
    </TouchableOpacity>
  );
}

function PageNumber({ num, active, disabled, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.pageBtn,
        active
          ? { backgroundColor: colors.primary }
          : { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
      ]}
      onPress={onPress}
      disabled={disabled || active}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.pageLabel,
        { color: active ? colors.background : colors.textSecondary },
      ]}>
        {num}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    flexWrap: 'wrap',
    gap: 8,
  },
  info:    { fontSize: 13 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  iconBtn: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  pageBtn: {
    minWidth: 32, height: 32, borderRadius: RADIUS.sm,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pageLabel: { fontSize: 13, fontWeight: '600' },
  dots: { fontSize: 14, paddingHorizontal: 2 },
});
