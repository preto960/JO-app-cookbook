// src/constants/theme.ts

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;

  primary: string;
  primaryDim: string;
  primaryGlow: string;

  accent: string;
  accentDim: string;

  success: string;
  warning: string;
  danger: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  adminGold: string;
  adminGoldDim: string;

  white: string;
  black: string;
};

export const DARK_COLORS: ThemeColors = {
  background: '#0A0F1E',
  surface: '#111827',
  surfaceElevated: '#1A2235',
  border: '#1E2D45',

  primary: '#00D4FF',
  primaryDim: '#00D4FF22',
  primaryGlow: '#00D4FF44',

  accent: '#7C3AED',
  accentDim: '#7C3AED22',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  textPrimary: '#F1F5F9',
  textSecondary: '#64748B',
  textMuted: '#334155',

  adminGold: '#F59E0B',
  adminGoldDim: '#F59E0B22',

  white: '#FFFFFF',
  black: '#000000',
};

export const LIGHT_COLORS: ThemeColors = {
  background: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceElevated: '#E8EFF7',
  border: '#CBD5E1',

  primary: '#0077A8',
  primaryDim: '#0077A822',
  primaryGlow: '#0077A844',

  accent: '#6D28D9',
  accentDim: '#6D28D922',

  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  adminGold: '#B45309',
  adminGoldDim: '#B4530922',

  white: '#FFFFFF',
  black: '#000000',
};

// Legacy export – screens that haven't migrated yet will
// still compile; they'll just always use the dark palette.
export const COLORS = DARK_COLORS;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
