// src/screens/users/UsersScreen.tsx
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { useApiCall } from '../../hooks/useApiCall';
import { StatusBadge, EmptyState, SkeletonList, Pagination, ActionMenu } from '../../components';
import { SPACING, RADIUS } from '../../constants/theme';
import type { ApiUser } from '../../types/api.types';

const ROLE_OPTIONS   = ['All roles',   'ADMIN', 'DEVELOPER', 'USER'];
const STATUS_OPTIONS = ['All statuses', 'Active', 'Inactive'];

interface Props { navigation: any }

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
    items: rawItems, loading, page, totalPages, total,
    loadPage, refresh, setParams,
  } = usePagination<ApiUser, any>({
    apiFunction: userService.getAll,
    pageSize: 20,
    onError: (e) => toast.error('Load failed', e),
  });

  const items = Array.isArray(rawItems) ? rawItems : [];

  useEffect(() => {
    setParams({
      ...(search ? { search } : {}),
      ...(role   ? { role }   : {}),
      ...(status ? { status: status.toLowerCase() } : {}),
    });
  }, [search, role, status]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Barra de búsqueda compacta */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
            placeholder="Search users…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('UserForm')}
        >
          <Ionicons name="add" size={18} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Filtros de chips */}
      <View style={[styles.filtersRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ROLE_OPTIONS.map(opt => {
            const val = opt === 'All roles' ? null : opt;
            const active = role === val;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
                ]}
                onPress={() => setRole(val)}
              >
                <Text style={[styles.chipText, { color: active ? colors.background : colors.textSecondary }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUS_OPTIONS.map(opt => {
            const val = opt === 'All statuses' ? null : opt;
            const active = status === val;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
                ]}
                onPress={() => setStatus(val)}
              >
                <Text style={[styles.chipText, { color: active ? colors.background : colors.textSecondary }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={loading && items.length > 0} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Header de sección */}
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
            actionLabel={search ? undefined : 'New user'}
            onAction={search ? undefined : () => navigation.navigate('UserForm')}
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
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: colors.primaryDim }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {user.firstName?.[0]?.toUpperCase() ?? 'U'}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>

                {/* Badges + actions */}
                <View style={styles.userRight}>
                  <View style={styles.badgesCol}>
                    <StatusBadge label={user.role} auto size="sm" />
                    <StatusBadge label={user.isActive ? 'active' : 'inactive'} auto size="sm" />
                  </View>
                  <ActionMenu actions={[
                    { label: 'Edit',            icon: 'pencil-outline',       onPress: () => navigation.navigate('UserForm', { userId: user.id }) },
                    { label: 'Change password', icon: 'key-outline',          onPress: () => navigation.navigate('UserPassword', { userId: user.id }) },
                    { label: user.isActive ? 'Deactivate' : 'Activate', icon: user.isActive ? 'pause-circle-outline' : 'play-circle-outline', onPress: () => handleToggleStatus(user) },
                    { label: 'Delete',          icon: 'trash-outline',        danger: true, onPress: () => handleDelete(user) },
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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 40, borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.sm, gap: 6,
  },
  input: { flex: 1, fontSize: 14 },
  addBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },

  filtersRow: {
    gap: 2,
    borderBottomWidth: 1,
    paddingBottom: SPACING.xs,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  chip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  scroll:      { flex: 1 },
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
