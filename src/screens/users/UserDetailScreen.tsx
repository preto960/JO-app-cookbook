// src/screens/users/UserDetailScreen.tsx
// Shows full user profile fetched from API.
// Cross-platform: web, iOS, Android.
import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/api';
import { useApiCall } from '../../hooks/useApiCall';
import {
  StatusBadge, EmptyState, ThemedCard, InfoRow,
  SkeletonList,
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

  const { data: user, loading, error, execute: loadUser } = useApiCall(userService.getById, {
    onError: (e) => toast.error('Load failed', e),
  });

  const { execute: toggleStatus } = useApiCall(userService.toggleStatus, {
    onSuccess: () => { toast.success('Status updated'); loadUser(userId); },
    onError: (e) => toast.error('Failed', e),
  });

  const { execute: deleteUser } = useApiCall(userService.delete, {
    onSuccess: () => { toast.success('User deleted'); navigation.goBack(); },
    onError: (e) => toast.error('Delete failed', e),
  });

  useEffect(() => { loadUser(userId); }, [userId]);

  // Set header title only — no headerRight ActionMenu (it was misaligned)
  useEffect(() => {
    if (!user) return;
    navigation.setOptions({
      title: `${user.firstName} ${user.lastName}`,
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
        onAction={() => navigation.goBack()}
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

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
          onPress={() => navigation.navigate('UserForm', { userId })}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          <Text style={[styles.btnLabel, { color: colors.primary }]}>Edit user</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={() => navigation.navigate('UserPassword', { userId })}
          activeOpacity={0.8}
        >
          <Ionicons name="key-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>Password</Text>
        </TouchableOpacity>
      </View>

      {/* Secondary actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={() => toggleStatus(userId)}
          activeOpacity={0.8}
        >
          <Ionicons name={user.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={colors.textSecondary} />
          <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>
            {user.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}
          onPress={() => deleteUser(userId)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.btnLabel, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.lg },

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

  actions: { flexDirection: 'row', gap: 12, marginBottom: SPACING.sm },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 44, borderRadius: RADIUS.md, borderWidth: 1,
  },
  btnLabel: { fontSize: 14, fontWeight: '700' },
});
