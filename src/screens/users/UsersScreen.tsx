// src/screens/users/UsersScreen.tsx
// Paginated user list with search, role/status filters, and row actions.
// Only accessible to ADMIN/DEVELOPER roles.
// Cross-platform: web, iOS, Android.
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { useApiCall } from '../../hooks/useApiCall';
import {
  SearchBar, FilterBar, StatusBadge, EmptyState,
  SkeletonList, Pagination, ActionMenu, SectionHeader, ListCard,
} from '../../components';
import { SPACING, RADIUS } from '../../constants/theme';
import type { ApiUser, FilterOption } from '../../types/api.types';

const ROLE_FILTERS: FilterOption[] = [
  { label: 'Admin',     value: 'ADMIN' },
  { label: 'Developer', value: 'DEVELOPER' },
  { label: 'User',      value: 'USER' },
];
const STATUS_FILTERS: FilterOption[] = [
  { label: 'Active',   value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

interface Props {
  navigation: any;
}

export default function UsersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const toast = useToast();

  const [search, setSearch]   = useState('');
  const [role,   setRole]     = useState<string | null>(null);
  const [status, setStatus]   = useState<string | null>(null);

  const { execute: toggleStatus } = useApiCall(userService.toggleStatus, {
    onError: (e) => toast.error('Action failed', e),
  });
  const { execute: deleteUser } = useApiCall(userService.delete, {
    onError: (e) => toast.error('Delete failed', e),
  });

  const {
    items, loading, loadingMore, error,
    page, totalPages, total,
    loadPage, refresh, setParams,
  } = usePagination<ApiUser, any>({
    apiFunction: userService.getAll,
    pageSize: 20,
    onError: (e) => toast.error('Load failed', e),
  });

  // Sync filters → params and refresh
  useEffect(() => {
    setParams({
      ...(search ? { search } : {}),
      ...(role   ? { role }   : {}),
      ...(status ? { status } : {}),
    });
  }, [search, role, status]);

  // Trigger fetch after params update
  useEffect(() => { refresh(); }, [search, role, status]);

  const handleToggleStatus = useCallback(async (user: ApiUser) => {
    const result = await toggleStatus(user.id);
    if (result) {
      toast.success(result.isActive ? 'User activated' : 'User deactivated');
      refresh();
    }
  }, [toggleStatus, refresh]);

  const handleDelete = useCallback(async (user: ApiUser) => {
    await deleteUser(user.id);
    toast.success('User deleted');
    refresh();
  }, [deleteUser, refresh]);

  const renderUser = (user: ApiUser) => (
    <TouchableOpacity
      key={user.id}
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('UserDetail', { userId: user.id })}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primaryDim }]}>
        {user.avatar
          ? null
          : <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user.firstName?.[0]?.toUpperCase() ?? 'U'}
            </Text>
        }
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
          {user.email}
        </Text>
      </View>

      {/* Badges */}
      <View style={styles.badges}>
        <StatusBadge label={user.role} auto size="sm" />
        <StatusBadge label={user.isActive ? 'active' : 'inactive'} auto size="sm" />
      </View>

      {/* Actions */}
      <ActionMenu actions={[
        {
          label: 'Edit',
          icon: 'pencil-outline',
          onPress: () => navigation.navigate('UserForm', { userId: user.id }),
        },
        {
          label: user.isActive ? 'Deactivate' : 'Activate',
          icon: user.isActive ? 'pause-circle-outline' : 'play-circle-outline',
          onPress: () => handleToggleStatus(user),
        },
        {
          label: 'Change password',
          icon: 'key-outline',
          onPress: () => navigation.navigate('UserPassword', { userId: user.id }),
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          danger: true,
          onPress: () => handleDelete(user),
        },
      ]} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search + filters */}
      <View style={styles.filterArea}>
        <SearchBar
          placeholder="Search by name or email…"
          onSearch={setSearch}
        />
        <View style={styles.filterRow}>
          <FilterBar
            options={ROLE_FILTERS}
            value={role}
            onChange={setRole}
            allLabel="All roles"
          />
        </View>
        <View style={styles.filterRow}>
          <FilterBar
            options={STATUS_FILTERS}
            value={status}
            onChange={setStatus}
            allLabel="All statuses"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && items.length > 0} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <SectionHeader
          title="Users"
          subtitle={total > 0 ? `${total} total` : undefined}
          rightElement={
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('UserForm')}
            >
              <Ionicons name="add" size={18} color={colors.background} />
              <Text style={[styles.addLabel, { color: colors.background }]}>New user</Text>
            </TouchableOpacity>
          }
        />

        {loading && items.length === 0 ? (
          <SkeletonList count={8} />
        ) : error && items.length === 0 ? (
          <EmptyState
            type="error"
            title="Failed to load users"
            description={error}
            actionLabel="Retry"
            onAction={refresh}
          />
        ) : items.length === 0 ? (
          <EmptyState
            type="search"
            title={search ? 'No results found' : 'No users yet'}
            description={search ? `No users match "${search}"` : 'Create the first user.'}
            actionLabel={search ? undefined : 'New user'}
            onAction={search ? undefined : () => navigation.navigate('UserForm')}
          />
        ) : (
          <ListCard noPadding>
            {items.map(renderUser)}
          </ListCard>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={loadPage}
        />

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  filterArea: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: 8 },
  filterRow:  {},
  scroll:     { flex: 1 },
  content:    { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    gap: 10,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  info:       { flex: 1, minWidth: 0 },
  name:       { fontSize: 14, fontWeight: '600' },
  email:      { fontSize: 12, marginTop: 1 },
  badges:     { alignItems: 'flex-end', gap: 4, flexShrink: 0 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7,
  },
  addLabel: { fontSize: 13, fontWeight: '700' },
});
