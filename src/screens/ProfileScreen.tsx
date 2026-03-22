// src/screens/ProfileScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { useAuth, fullName } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

export default function ProfileScreen() {
  const { user, isSuperAdmin } = useAuth();
  const { colors } = useTheme();

  const name    = fullName(user);
  const initial = user?.firstName?.[0]?.toUpperCase() ?? 'U';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar ── */}
      <View style={styles.avatarSection}>
        {user?.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={[styles.avatarImage, { borderColor: colors.primary }]}
          />
        ) : (
          <View style={[
            styles.avatarFallback,
            { backgroundColor: colors.primaryDim, borderColor: colors.primary },
          ]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {initial}
            </Text>
          </View>
        )}

        <Text style={[styles.displayName, { color: colors.textPrimary }]}>{name}</Text>
        <Text style={[styles.displayEmail, { color: colors.textSecondary }]}>
          {user?.email}
        </Text>

        {/* Role badge — no emoji, no crown */}
        <View style={[
          styles.roleBadge,
          { backgroundColor: isSuperAdmin ? colors.adminGoldDim : colors.primaryDim },
        ]}>
          <Text style={[
            styles.roleText,
            { color: isSuperAdmin ? colors.adminGold : colors.primary },
          ]}>
            {isSuperAdmin ? 'Super Admin' : user?.role ?? 'User'}
          </Text>
        </View>
      </View>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.lg },

  avatarSection: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    gap: 6,
  },

  avatarImage: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, marginBottom: SPACING.sm,
  },
  avatarFallback: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, marginBottom: SPACING.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800' },

  displayName:  { fontSize: 22, fontWeight: '800' },
  displayEmail: { fontSize: 14 },

  roleBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 6,
  },
  roleText: { fontSize: 13, fontWeight: '700' },
});
