// App.tsx — Updated: adds I18nProvider
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider }     from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider }    from './src/context/ToastContext';
import { DebugProvider }    from './src/context/DebugContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { I18nProvider }     from './src/context/I18nContext';
import { DataRefreshProvider } from './src/context/DataRefreshContext';
import { PermissionsProvider } from './src/context/PermissionsContext';
import AppNavigator         from './src/navigation/AppNavigator';

function ThemedApp() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <AuthProvider>
        <PermissionsProvider>
          <AppNavigator />
        </PermissionsProvider>
      </AuthProvider>
    </View>
  );
}

// Provider order (outermost → most global):
//  DebugProvider      — captures global JS errors
//  ToastProvider      — toast queue
//  SettingsProvider   — persisted local settings
//  I18nProvider       — translations from API
//  DataRefreshProvider — data change notifications
//  ThemeProvider      — colors
//  AuthProvider       — user authentication
//  PermissionsProvider — user permissions (needs auth context)
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <DebugProvider>
        <ToastProvider>
          <SettingsProvider>
            <I18nProvider>
              <DataRefreshProvider>
                <ThemeProvider>
                  <ThemedApp />
                </ThemeProvider>
              </DataRefreshProvider>
            </I18nProvider>
          </SettingsProvider>
        </ToastProvider>
      </DebugProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
