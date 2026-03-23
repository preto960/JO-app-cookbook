// src/components/permissions/RoleBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/theme';

interface Props {
  role: string;
  size?: 'sm' | 'md';
}

type RoleConfig = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  getColors: (c: any) => { bg: string; text: string; border: string };
};

const ROLE_CONFIG: Record<string, RoleConfig> = {
  ADMIN: {
    icon: 'shield-checkmark-outline',
    getColors: c => ({ bg: c.adminGoldDim, text: c.adminGold, border: `${c.adminGold}55` }),
  },
  DEVELOPER: {
    icon: 'code-slash-outline',
    getColors: c => ({ bg: c.accentDim, text: c.accent, border: `${c.accent}55` }),
  },
  MODERATOR: {
    icon: 'eye-outline',
    getColors: c => ({ bg: c.primaryDim, text: c.primary, border: `${c.primary}55` }),
  },
  USER: {
    icon: 'person-outline',
    getColors: c => ({ bg: c.surfaceElevated, text: c.textSecondary, border: c.border }),
  },
};

const DEFAULT_CONFIG: RoleConfig = {
  icon: 'ellipse-outline',
  getColors: c => ({ bg: c.surfaceElevated, text: c.textSecondary, border: c.border }),
};

export default function RoleBadge({ role, size = 'md' }: Props) {
  const { colors } = useTheme();
  const cfg = ROLE_CONFIG[role] ?? DEFAULT_CONFIG;
  const { bg, text, border } = cfg.getColors(colors);

  const isSmall = size === 'sm';

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: bg,
        borderColor: border,
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical:   isSmall ? 2 : 4,
        borderRadius: RADIUS.full,
      },
    ]}>
      <Ionicons name={cfg.icon} size={isSmall ? 10 : 12} color={text} />
      <Text style={[
        styles.label,
        { color: text, fontSize: isSmall ? 10 : 12 },
      ]}>
        {role}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontWeight: '700' },
});
