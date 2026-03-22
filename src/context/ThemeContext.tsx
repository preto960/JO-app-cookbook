// src/context/ThemeContext.tsx
import React, {
  createContext, useContext, useState, useEffect, ReactNode,
} from 'react';
import { useColorScheme, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeColors, DARK_COLORS, LIGHT_COLORS } from '../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode:        ThemeMode;
  colors:      ThemeColors;
  isDark:      boolean;
  toggleTheme: () => void;
}

// ─── Storage helper ───────────────────────────────────────────────────────────
const THEME_KEY = 'app_theme_mode';

const storage = {
  get: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
    return SecureStore.getItemAsync(key);
  },
  set: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use system scheme as initial value before persisted preference loads
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemScheme === 'light' ? 'light' : 'dark');
  const [ready, setReady] = useState(false);

  // Load persisted preference once on mount
  useEffect(() => {
    storage.get(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setMode(saved);
      }
      setReady(true);
    });
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    storage.set(THEME_KEY, next).catch(() => {});
  };

  const isDark  = mode === 'dark';
  const colors  = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Avoid flash of wrong theme while reading storage
  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
