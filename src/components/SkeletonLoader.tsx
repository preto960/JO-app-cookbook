// src/components/SkeletonLoader.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

// useNativeDriver solo en nativo, no en web
const USE_NATIVE = Platform.OS !== 'web';

interface SkeletonBoxProps {
  width?:  number | string;
  height?: number;
  radius?: number;
  style?:  ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, radius = RADIUS.sm, style }: SkeletonBoxProps) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: USE_NATIVE }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: USE_NATIVE }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const bg = isDark ? colors.surfaceElevated : colors.border;

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: bg, opacity },
        style,
      ] as unknown as ViewStyle}
    />
  );
}

export function SkeletonListRow() {
  return (
    <View style={skStyles.row}>
      <SkeletonBox width={44} height={44} radius={22} />
      <View style={skStyles.lines}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="40%" height={11} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={60} height={22} radius={RADIUS.full} />
    </View>
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[skStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonBox width="100%" height={120} radius={RADIUS.sm} />
      <View style={skStyles.cardBody}>
        <SkeletonBox width="70%" height={16} />
        <SkeletonBox width="50%" height={12} style={{ marginTop: 8 }} />
        <View style={skStyles.cardFooter}>
          <SkeletonBox width={60} height={20} radius={RADIUS.full} />
          <SkeletonBox width={60} height={20} radius={RADIUS.full} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonStatCard() {
  const { colors } = useTheme();
  return (
    <View style={[skStyles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonBox width="50%" height={24} />
      <SkeletonBox width="70%" height={12} style={{ marginTop: 8 }} />
      <SkeletonBox width={50}  height={18} radius={RADIUS.full} style={{ marginTop: 10 }} />
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[skStyles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          <SkeletonListRow />
          {i < count - 1 && <View style={[skStyles.divider, { backgroundColor: colors.border }]} />}
        </View>
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  lines: { flex: 1 },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  cardBody:   { padding: SPACING.md },
  cardFooter: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: {
    flex: 1, minWidth: '44%',
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.md,
  },
  list: {
    borderRadius: RADIUS.lg, borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  divider: { height: 1, marginHorizontal: SPACING.md },
});
