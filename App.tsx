// App.tsx — Updated: adds I18nProvider
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider }     from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider }    from './src/context/ToastContext';
import { DebugProvider }    from './src/context/DebugContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { I18nProvider }     from './src/context/I18nContext';
import AppNavigator         from './src/navigation/AppNavigator';

function ThemedApp() {
  const { colors, isDark } = useTheme();

  if (Platform.OS === 'web') {
    document.body.style.backgroundColor = colors.background;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </View>
  );
}

// Provider order (outermost → most global):
//  DebugProvider    — captures global JS errors
//  ToastProvider    — toast queue
//  SettingsProvider — persisted local settings
//  I18nProvider     — translations from API
//  ThemeProvider    — colors
export default function App() {
  return (
    <DebugProvider>
      <ToastProvider>
        <SettingsProvider>
          <I18nProvider>
            <ThemeProvider>
              <ThemedApp />
            </ThemeProvider>
          </I18nProvider>
        </SettingsProvider>
      </ToastProvider>
    </DebugProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
