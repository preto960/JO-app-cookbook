// src/components/HeaderAvatar.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Pressable, Platform, Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth, fullName } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

export default function HeaderAvatar() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false);

  const initial = user?.firstName?.[0]?.toUpperCase() ?? 'U';
  const name    = fullName(user);

  const handleProfile = () => {
    setOpen(false);
    navigation.navigate('Profile');
  };

  const handleLogout = () => {
    setOpen(false);
    setTimeout(() => logout(), 150);
  };

  return (
    <View style={styles.wrapper}>
      {/* Avatar button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        style={[styles.avatarBtn, { borderColor: colors.primary, backgroundColor: colors.primaryDim }]}
        accessibilityLabel="Open user menu"
      >
        {user?.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={styles.avatarImg}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
        )}
      </TouchableOpacity>

      {/* Dropdown modal */}
      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

        <View
          style={[
            styles.menu,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...(Platform.OS === 'web'
                ? { boxShadow: '0 8px 32px 0 rgba(0,0,0,0.28)' }
                : {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.22,
                    shadowRadius: 16,
                    elevation: 12,
                  }),
            },
          ]}
        >
          {/* User info */}
          <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.menuAvatar, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.menuAvatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[styles.menuAvatarInitial, { color: colors.primary }]}>{initial}</Text>
              )}
            </View>
            <View style={styles.menuUserInfo}>
              <Text style={[styles.menuName, { color: colors.textPrimary }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.menuRole, { color: colors.textSecondary }]} numberOfLines={1}>
                {user?.role ?? 'User'}
              </Text>
            </View>
          </View>

          {/* Profile */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={handleProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>Profile</Text>
          </TouchableOpacity>

          {/* Sign Out */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
            <Text style={[styles.menuItemText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginRight: 12 },

  avatarBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg:     { width: 32, height: 32, borderRadius: 16 },
  avatarInitial: { fontSize: 13, fontWeight: '800' },

  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },

  menu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    right: 12,
    width: 220,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },

  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  menuAvatar: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  menuAvatarImg:     { width: 36, height: 36, borderRadius: 18 },
  menuAvatarInitial: { fontSize: 14, fontWeight: '800' },
  menuUserInfo:      { flex: 1 },
  menuName:  { fontSize: 14, fontWeight: '700' },
  menuRole:  { fontSize: 11, marginTop: 1 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
  },
  menuItemText: { fontSize: 14, fontWeight: '500' },
});
