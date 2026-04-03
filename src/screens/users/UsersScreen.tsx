// src/screens/users/UsersScreen.tsx
import React, { useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useUsersRefresh } from '../../context/DataRefreshContext';
import { userService } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { useApiCall } from '../../hooks/useApiCall';
import { StatusBadge, EmptyState, SkeletonList, Pagination, ActionMenu, ProtectedRoute } from '../../components';
import { useResourcePermissions } from '../../context/PermissionsContext';
import SharedFilterBar from '../../components/SharedFilterBar';
import { SPACING, RADIUS } from '../../constants/theme';
import type { ApiUser } from '../../types/api.types';

const ROLE_CHIPS = [
  { label: 'All roles',  value: null },
  { label: 'ADMIN',      value: 'ADMIN' },
  { label: 'DEVELOPER',  value: 'DEVELOPER' },
  { label: 'USER',       value: 'USER' },
];

const STATUS_CHIPS = [
  { label: 'All',      value: null },
  { label: 'Active',   value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

interface Props {
  navigation: any;
  route?: { params?: { refresh?: boolean } };
}

function UsersScreenContent({ navigation, route }: Props) {
  const { colors } = useTheme();
  const toast = useToast();
  const { subscribeToUsersChange, notifyUsersChanged } = useUsersRefresh();
  
  // Permisos para usuarios
  const permissions = useResourcePermissions('USERS');

  const [search, setSearch] = React.useState('');
  const [role,   setRole]   = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const { execute: toggleStatus } = useApiCall(userService.toggleStatus, {
    onError: (e) => toast.error('Action failed', e),
  });
  const { execute: deleteUser } = useApiCall(userService.delete, {
    onError: (e) => toast.error('Delete failed', e),
  });

  const {
    items: rawItems, loading, page, totalPages, total,
    loadPage, refreshWithParams,
  } = usePagination<ApiUser, any>({
    apiFunction: userService.getAll,
    pageSize: 20,
    initialFetch: 'manual',
    onError: (e) => toast.error('Load failed', e),
  });

  const items = Array.isArray(rawItems) ? rawItems : [];

  const buildParams = useCallback(() => ({
    ...(search ? { search } : {}),
    ...(role   ? { role }   : {}),
    ...(status ? { status } : {}),
  }), [search, role, status]);

  useFocusEffect(
    useCallback(() => {
      refreshWithParams(buildParams());
      if (route?.params?.refresh) {
        navigation.setParams({ refresh: undefined });
      }
    }, [buildParams, refreshWithParams, route?.params?.refresh, navigation]),
  );

  useEffect(() => {
    const unsubscribe = subscribeToUsersChange(() => {
      refreshWithParams(buildParams());
    });
    return unsubscribe;
  }, [subscribeToUsersChange, refreshWithParams, buildParams]);

  const handleToggleStatus = useCallback(async (user: ApiUser) => {
    const result = await toggleStatus(user.id);
    if (result) {
      toast.success(result.isActive ? 'User activated' : 'User deactivated');
      notifyUsersChanged();
    }
  }, [toggleStatus, toast, notifyUsersChanged]);

  const handleDelete = useCallback(async (user: ApiUser) => {
    await deleteUser(user.id);
    toast.success('User deleted');
    notifyUsersChanged();
  }, [deleteUser, toast, notifyUsersChanged]);

  const handleChipChange = (groupIndex: number, value: string | null) => {
    if (groupIndex === 0) {
      setRole(value);
    } else if (groupIndex === 1) {
      setStatus(value);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SharedFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search users…"
        chipGroups={[ROLE_CHIPS, STATUS_CHIPS]}
        chipValues={[role, status]}
        onChipChange={handleChipChange}
        onAction={permissions.canCreate ? () => navigation.navigate('UserForm') : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={loading && items.length > 0}
            onRefresh={() => refreshWithParams(buildParams())}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Users</Text>
          {total > 0 && (
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{total} total</Text>
          )}
        </View>

        {loading && items.length === 0 ? (
          <SkeletonList count={6} />
        ) : items.length === 0 ? (
          <EmptyState
            type={search ? 'search' : 'empty'}
            title={search ? 'No results found' : 'No users yet'}
            description={search ? `No users match "${search}"` : 'Create the first user.'}
            actionLabel={search ? undefined : (permissions.canCreate ? 'New user' : undefined)}
            onAction={search ? undefined : (permissions.canCreate ? () => navigation.navigate('UserForm') : undefined)}
          />
        ) : (
          <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {items.map((user, idx) => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userRow,
                  idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={() => navigation.navigate('UserDetail', { userId: user.id })}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primaryDim }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {user.firstName?.[0]?.toUpperCase() ?? 'U'}
                  </Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>

                <View style={styles.userRight}>
                  <View style={styles.badgesCol}>
                    <StatusBadge label={user.role} auto size="sm" />
                    <StatusBadge label={user.isActive ? 'active' : 'inactive'} auto size="sm" />
                  </View>
                  <ActionMenu actions={[
                    ...(permissions.canEdit ? [{ label: 'Edit', icon: 'pencil-outline' as const, onPress: () => navigation.navigate('UserForm', { userId: user.id }) }] : []),
                    ...(permissions.canEdit ? [{ label: 'Change password', icon: 'key-outline' as const, onPress: () => navigation.navigate('UserPassword', { userId: user.id }) }] : []),
                    ...(permissions.canEdit ? [{ label: user.isActive ? 'Deactivate' : 'Activate', icon: user.isActive ? 'pause-circle-outline' as const : 'play-circle-outline' as const, onPress: () => handleToggleStatus(user) }] : []),
                    ...(permissions.canDelete ? [{ label: 'Delete', icon: 'trash-outline' as const, danger: true, onPress: () => handleDelete(user) }] : []),
                  ]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPage={loadPage} />
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { flex: 1 },
  listContent: { padding: SPACING.md },

  sectionRow: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionCount: { fontSize: 12 },

  listCard: {
    borderRadius: RADIUS.lg, borderWidth: 1,
    overflow: 'hidden', marginBottom: SPACING.md,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    gap: 10,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  userInfo:   { flex: 1, minWidth: 0 },
  userName:   { fontSize: 14, fontWeight: '600' },
  userEmail:  { fontSize: 12, marginTop: 1 },
  userRight:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  badgesCol:  { gap: 3, alignItems: 'flex-end' },
});

export default function UsersScreen(props: Props) {
  return (
    <ProtectedRoute resource="USERS" action="canView">
      <UsersScreenContent {...props} />
    </ProtectedRoute>
  );
}
