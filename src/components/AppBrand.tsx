// src/components/AppBrand.tsx
// Reusable brand logo + name, used in LoginScreen, splash, about, etc.
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/theme';

interface AppBrandProps {
  /** Show the tagline below the app name */
  tagline?: string;
  /** Override size: 'sm' | 'md' | 'lg' (default: 'lg') */
  size?: 'sm' | 'md' | 'lg';
}

const APP_NAME = 'CookBook-JO';
const APP_INITIAL = 'J'; // First letter for the logo ring

const SIZE_MAP = {
  sm: { ring: 48, inner: 36, logo: 18, name: 18, tagline: 12 },
  md: { ring: 64, inner: 48, logo: 24, name: 22, tagline: 13 },
  lg: { ring: 80, inner: 60, logo: 28, name: 28, tagline: 14 },
};

export default function AppBrand({ tagline, size = 'lg' }: AppBrandProps) {
  const { colors } = useTheme();
  const s = SIZE_MAP[size];

  const glowShadow =
    Platform.OS === 'web'
      ? ({ boxShadow: `0 0 18px 0 ${colors.primary}99` } as any)
      : {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55,
          shadowRadius: 12,
          elevation: 8,
        };

  return (
    <View style={styles.container}>
      {/* Logo ring */}
      <View
        style={[
          styles.logoRing,
          {
            width: s.ring,
            height: s.ring,
            borderRadius: s.ring / 2,
            borderColor: colors.primary,
          },
          glowShadow,
        ]}
      >
        <View
          style={[
            styles.logoInner,
            {
              width: s.inner,
              height: s.inner,
              borderRadius: s.inner / 2,
              backgroundColor: colors.primaryDim,
            },
          ]}
        >
          <Text style={[styles.logoText, { color: colors.primary, fontSize: s.logo }]}>
            {APP_INITIAL}
          </Text>
        </View>
      </View>

      {/* App name */}
      <Text style={[styles.appName, { color: colors.textPrimary, fontSize: s.name }]}>
        {APP_NAME}
      </Text>

      {/* Optional tagline */}
      {tagline ? (
        <Text style={[styles.tagline, { color: colors.textSecondary, fontSize: s.tagline }]}>
          {tagline}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 0,
  },
  logoRing: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontWeight: '800',
  },
  appName: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 4,
  },
});
