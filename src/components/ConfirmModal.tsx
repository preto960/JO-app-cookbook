// src/components/ConfirmModal.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  visible, title, message, confirmText = 'Confirm',
  cancelText = 'Cancel', onConfirm, onCancel, danger = false,
}: Props) {
  const { colors } = useTheme();

  // On native, use platform Alert when it becomes visible
  React.useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: onCancel },
        {
          text: confirmText,
          style: danger ? 'destructive' : 'default',
          onPress: onConfirm,
        },
      ],
      { cancelable: true, onDismiss: onCancel }
    );
  }, [visible]);

  // On native, Alert handles it — render nothing
  if (Platform.OS !== 'web') return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Icon */}
          <View style={[
            styles.iconRing,
            danger
              ? { backgroundColor: '#EF444422', borderColor: colors.danger }
              : { backgroundColor: colors.primaryDim, borderColor: colors.primary },
          ]}>
            <Text style={{ fontSize: 28 }}>{danger ? '🚪' : '❓'}</Text>
          </View>

          {/* Text */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: danger ? colors.danger : colors.primary },
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.confirmText, { color: colors.background }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontWeight: '600',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontWeight: '800',
    fontSize: 15,
  },
});
