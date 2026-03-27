// src/screens/users/UserDetailScreen.tsx
// Shows full user profile fetched from API.
// Cross-platform: web, iOS, Android.
import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useUsersRefresh } from '../../context/DataRefreshContext';
import { userService } from '../../services/api';
import { useApiCall } from '../../hooks/useApiCall';
import {
  StatusBadge, EmptyState, ThemedCard, InfoRow,
  SkeletonList, ActionMenu,
} from '../../components';
import { SPACING, RADIUS } from '../../constants/theme';

interface Props {
  navigation: any;
  route: { params: { userId: string } };
}

export default function UserDetailScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { colors } = useTheme();
  const toast = useToast();
  const { notifyUsersChanged } = useUsersRefresh();

  const { data: user, loading, error, execute: loadUser } = useApiCall(userService.getById, {
    onError: (e) => toast.error('Load failed', e),
  });

  const { execute: toggleStatus } = useApiCall(userService.toggleStatus, {
    onSuccess: () => { 
      toast.success('Status updated'); 
      loadUser(userId);
      notifyUsersChanged(); // Notificar cambio global
    },
    onError: (e) => toast.error('Failed', e),
  });

  const { execute: deleteUser } = useApiCall(userService.delete, {
    onSuccess: () => { 
      toast.success('User deleted');
      notifyUsersChanged(); // Notificar cambio global
      navigation.navigate('Users'); 
    },
    onError: (e) => toast.error('Delete failed', e),
  });

  useEffect(() => { loadUser(userId); }, [userId]);

  useEffect(() => {
    if (!user) return;

    const handleDelete = () => {
      if (Platform.OS !== 'web') {
        Alert.alert('Delete user', `Delete ${user.firstName} ${user.lastName}? This cannot be undone.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteUser(userId) },
        ]);
      } else {
        deleteUser(userId);
      }
    };

    navigation.setOptions({
      title: `${user.firstName} ${user.lastName}`,
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Users')}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <ActionMenu actions={[
          {
            label: 'Edit',
            icon: 'pencil-outline',
            onPress: () => navigation.navigate('UserForm', { userId }),
          },
          {
            label: 'Change password',
            icon: 'key-outline',
            onPress: () => navigation.navigate('UserPassword', { userId }),
          },
          {
            label: user.isActive ? 'Deactivate' : 'Activate',
            icon: user.isActive ? 'pause-circle-outline' : 'play-circle-outline',
            onPress: () => toggleStatus(userId),
          },
          {
            label: 'Delete',
            icon: 'trash-outline',
            danger: true,
            onPress: handleDelete,
          },
        ]} />
      ),
    });
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={6} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <EmptyState
        type="error"
        title="User not found"
        description={error ?? undefined}
        actionLabel="Go back"
        onAction={() => navigation.navigate('Users')}
      />
    );
  }

  const initial = user.firstName?.[0]?.toUpperCase() ?? 'U';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {/* Avatar section */}
      <View style={styles.avatarSection}>
        {user.avatar
          ? <Image source={{ uri: user.avatar }} style={[styles.avatarImg, { borderColor: colors.primary }]} />
          : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
            </View>
          )
        }
        <Text style={[styles.displayName, { color: colors.textPrimary }]}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={[styles.displayEmail, { color: colors.textSecondary }]}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <StatusBadge label={user.role} auto />
          <StatusBadge label={user.isActive ? 'active' : 'inactive'} auto />
        </View>
      </View>

      {/* Basic info */}
      <ThemedCard title="Account info">
        <InfoRow label="User ID"    value={user.id.toString()} />
        <InfoRow label="Role"       value={user.role} />
        <InfoRow label="Status"     value={user.isActive ? 'Active' : 'Inactive'} />
        <InfoRow label="Created"    value={new Date(user.createdAt).toLocaleDateString()} />
        <InfoRow label="Updated"    value={new Date(user.updatedAt).toLocaleDateString()} />
        {user.lastLoginAt && (
          <InfoRow label="Last login" value={new Date(user.lastLoginAt).toLocaleString()} />
        )}
      </ThemedCard>

      {/* Profile links */}
      {(user.bio || user.website || user.github || user.twitter) && (
        <ThemedCard title="Profile">
          {user.bio     && <InfoRow label="Bio"     value={user.bio} />}
          {user.website && <InfoRow label="Website" value={user.website} />}
          {user.github  && <InfoRow label="GitHub"  value={user.github} />}
          {user.twitter && <InfoRow label="Twitter" value={user.twitter} />}
        </ThemedCard>
      )}

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.lg },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  avatarSection: { alignItems: 'center', paddingVertical: SPACING.lg, gap: 6 },
  avatarImg: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, marginBottom: SPACING.sm,
  },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, marginBottom: SPACING.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 32, fontWeight: '800' },
  displayName:   { fontSize: 22, fontWeight: '800' },
  displayEmail:  { fontSize: 14 },
  badgeRow:      { flexDirection: 'row', gap: 8, marginTop: 4 },
});
