// src/components/ProtectedRoute.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/theme';

interface ProtectedRouteProps {
  resource: string;
  action?: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canInMenu';
  children: React.ReactNode;
  showAccessDenied?: boolean;
  customAccessDenied?: React.ReactNode;
}

export function ProtectedRoute({ 
  resource, 
  action = 'canView', 
  children,
  showAccessDenied = true,
  customAccessDenied
}: ProtectedRouteProps) {
  const { user } = useAuth();
  const { hasPermission, loading, error, refresh } = usePermissions();
  const { colors } = useTheme();

  // Si no hay usuario autenticado, no mostrar nada (el AuthNavigator manejará la redirección)
  if (!user) {
    return null;
  }

  // Mostrar loading mientras carga permisos
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Loading...</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Checking permissions...
          </Text>
        </View>
      </View>
    );
  }

  // Mostrar error si falla la carga de permisos
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.danger }]}>Error</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Failed to load permissions. Please try again.
          </Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={refresh}
          >
            <Text style={[styles.buttonText, { color: colors.surface }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Verificar permisos
  if (!hasPermission(resource, action)) {
    // Si hay un componente personalizado para acceso denegado
    if (customAccessDenied) {
      return <>{customAccessDenied}</>;
    }

    // Si no se debe mostrar mensaje de acceso denegado, retornar null
    if (!showAccessDenied) {
      return null;
    }

    // Mostrar mensaje por defecto de acceso denegado
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Access Denied</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            You don't have permission to access this resource.
          </Text>
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            Resource: {resource} • Action: {action}
          </Text>
        </View>
      </View>
    );
  }

  // Si tiene permisos, renderizar children
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  detail: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
    opacity: 0.7,
  },
  button: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});