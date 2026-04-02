// src/components/ModalSheet.tsx
import React, { ReactNode } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

interface Props {
  visible:    boolean;
  onClose:    () => void;
  title?:     string;
  children:   ReactNode;
  primaryLabel?:    string;
  onPrimary?:       () => void;
  primaryLoading?:  boolean;
  primaryDanger?:   boolean;
  footer?:          ReactNode;
  maxHeightPct?:    number;
  dismissable?:     boolean;
  compact?:         boolean;
}

export default function ModalSheet({
  visible, onClose, title, children,
  primaryLabel, onPrimary, primaryLoading, primaryDanger,
  footer, maxHeightPct = 85, dismissable = true, compact = false,
}: Props) {
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';

  const sheetShadow = Platform.select({
    web: { boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 20,
    },
  });

  const sheetStyle = [
    styles.sheet,
    // Siempre usar centrado, tanto en web como en móviles
    compact ? styles.centeredCompact : styles.centered,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    sheetShadow,
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade" // Fade para todos los dispositivos (mejor para modales centrados)
      onRequestClose={dismissable ? onClose : undefined}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={[
          styles.overlay,
          { justifyContent: 'center' }, // Siempre centrar
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        {dismissable && (
          <Pressable style={styles.backdrop} onPress={onClose} />
        )}

        <View style={sheetStyle}>
          {/* Header */}
          {title && (
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Content container with proper flex */}
          <View style={styles.contentContainer}>
            {/* Scrollable body */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true} // Mostrar scrollbar
              nestedScrollEnabled={true}
              bounces={true} // Permitir bounce para mejor UX
              scrollEnabled={true} // Asegurar que el scroll esté habilitado
            >
              {children}
            </ScrollView>

            {/* Footer */}
            {footer ?? (primaryLabel && onPrimary ? (
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  onPress={onClose}
                >
                  <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: primaryDanger ? colors.danger : colors.primary },
                    primaryLoading && { opacity: 0.6 },
                  ]}
                  onPress={onPrimary}
                  disabled={primaryLoading}
                >
                  <Text style={[styles.primaryLabel, { color: colors.background }]}>
                    {primaryLoading ? 'Saving…' : primaryLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null)}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  sheet: {
    borderWidth: 1, // Borde completo para modales centrados
    flexDirection: 'column',
  },
  bottom: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
    minHeight: 200, // Altura mínima para asegurar visibilidad del contenido
    flex: 0, // No usar flex para permitir que el contenido determine la altura
  },
  centered: {
    alignSelf: 'center',
    width: '90%',
    maxWidth: Platform.OS === 'web' ? 480 : 350,
    maxHeight: '75%', // Reducir un poco para asegurar que no ocupe toda la pantalla
    minHeight: 400, // Altura mínima más grande para listas largas
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginHorizontal: 20,
    marginVertical: 40,
  },
  centeredCompact: {
    alignSelf: 'center',
    width: '85%',
    maxWidth: Platform.OS === 'web' ? 320 : 300,
    maxHeight: '65%', // Más pequeño para compacto
    minHeight: 300, // Altura mínima para permitir scroll
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginHorizontal: 20,
    marginVertical: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700' },
  contentContainer: {
    flex: 1,
    minHeight: 200,
    // No limitar maxHeight aquí, dejarlo al modal principal
  },
  body: { 
    flex: 1,
    // Altura máxima dinámica según si es compacto o no
    maxHeight: Platform.OS === 'web' ? undefined : 350,
  },
  bodyContent: { 
    padding: SPACING.lg,
    // Remover flexGrow para permitir scroll natural
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1, height: 46,
    borderRadius: RADIUS.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelLabel: { fontSize: 15, fontWeight: '600' },
  primaryBtn: {
    flex: 1, height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryLabel: { fontSize: 15, fontWeight: '700' },
});
