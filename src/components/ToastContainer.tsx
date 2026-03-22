// src/components/ToastContainer.tsx
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated,
  TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast, Toast, ToastType } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

// ─── Single toast ─────────────────────────────────────────────────────────────
function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const { colors, isDark } = useTheme();
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 180, useNativeDriver: true }),
      ]).start();
    }, toast.duration - 220);

    return () => clearTimeout(timer);
  }, []);

  const cfg = getConfig(toast.type, colors);

  return (
    <Animated.View style={[
      styles.toast,
      {
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        borderColor:     cfg.border,
        borderLeftColor: cfg.accent,
        opacity,
        transform: [{ translateY }],
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 4px 20px rgba(0,0,0,0.16)' }
          : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 7 }),
      },
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
        <Ionicons name={cfg.icon} size={14} color={cfg.accent} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {toast.title}
        </Text>
        {toast.message && (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
            {toast.message}
          </Text>
        )}
      </View>

      <TouchableOpacity onPress={() => removeToast(toast.id)} style={styles.closeBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name="close" size={13} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────
export default function ToastContainer() {
  const { toasts } = useToast();
  if (!toasts.length) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </View>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────
function getConfig(type: ToastType, colors: any) {
  switch (type) {
    case 'success': return { accent: colors.success, border: `${colors.success}44`, iconBg: `${colors.success}22`, icon: 'checkmark-circle' as const };
    case 'error':   return { accent: colors.danger,  border: `${colors.danger}44`,  iconBg: `${colors.danger}22`,  icon: 'alert-circle'     as const };
    case 'warning': return { accent: colors.warning, border: `${colors.warning}44`, iconBg: `${colors.warning}22`, icon: 'warning'          as const };
    case 'info':    return { accent: colors.primary, border: `${colors.primary}44`, iconBg: colors.primaryDim,     icon: 'information-circle' as const };
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    // Centered with a max width so it stays compact
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 9999,
    gap: 6,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems:    'center',
    width: '90%',
    maxWidth: 340,              // ← narrower toast
    borderRadius:  RADIUS.lg,
    borderWidth:   1,
    borderLeftWidth: 4,
    paddingVertical:   SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    gap: 8,
  },
  iconWrap: {
    width: 24, height: 24, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap:  { flex: 1, gap: 1 },
  title:     { fontSize: 13, fontWeight: '700' },
  message:   { fontSize: 11, lineHeight: 15 },
  closeBtn:  { padding: 2, flexShrink: 0 },
});
