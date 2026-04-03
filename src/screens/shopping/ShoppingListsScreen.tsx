// src/screens/shopping/ShoppingListsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDataRefresh } from '../../context/DataRefreshContext';
import { RADIUS, SPACING } from '../../constants/theme';
import { shoppingListService } from '../../services/api';
import type { ShoppingList } from '../../types/api.types';

import { useApiQuery } from '../../hooks';
import {
  Pagination, EmptyState,
  SkeletonList, StatusBadge, SharedFilterBar, ActionMenu, ConfirmModal,
  PermissionGuard, ProtectedRoute,
} from '../../components';
import { useResourcePermissions } from '../../context/PermissionsContext';


export default function ShoppingListsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { subscribeToDataChange } = useDataRefresh();
  
  // Permisos para shopping lists
  const permissions = useResourcePermissions('SHOPPING_LISTS');

  // ── State ──
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);
  const limit = 10;

  // ── API Call ──
  const {
    data: listsResponse,
    loading,
    error,
    setData,
  } = useApiQuery(
    () => {
      const params: any = { page, limit };

      // Only add search if it has content
      if (search.trim()) {
        params.search = search.trim();
      }

      // Only add isActive filter based on tab
      if (tab === 'active') {
        params.isActive = true;
      } else if (tab === 'inactive') {
        params.isActive = false;
      }

      // Bust cache after pull-to-refresh / delete so list refetch is not a stale GET
      return shoppingListService.getAll(params, refreshTrigger > 0);
    },
    [page, search, tab, refreshTrigger]
  );

  const lists = listsResponse?.data ?? [];
  const totalPages = listsResponse?.totalPages ?? 1;
  const total = listsResponse?.total ?? 0;

  useEffect(() => {
    return subscribeToDataChange('shoppingLists', () => {
      setRefreshTrigger((p) => p + 1);
    });
  }, [subscribeToDataChange]);

  /** Refetch al volver al tab / al listado (tras crear lista desde recetas u otra pantalla). */
  useFocusEffect(
    useCallback(() => {
      setRefreshTrigger((p) => p + 1);
    }, []),
  );

  // ── Handlers ──
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTabChange = (newTab: 'all' | 'active' | 'inactive') => {
    setTab(newTab);
    setPage(1);
  };

  const handleCreateList = () => {
    navigation.navigate('ShoppingListForm');
  };

  const handleViewList = (list: ShoppingList) => {
    navigation.navigate('ShoppingListDetail', { listId: list.id });
  };

  const handleEditList = (list: ShoppingList) => {
    navigation.navigate('ShoppingListForm', { listId: list.id });
  };

  const handleDeleteList = async (list: ShoppingList) => {
    setListToDelete(list);
  };

  const confirmDeleteList = async () => {
    if (!listToDelete) {return;}

    try {
      const removedId = listToDelete.id;
      await shoppingListService.delete(removedId);
      showToast('success', 'Shopping list deleted successfully');
      setData((prev) => {
        if (!prev?.data?.length) {
          return prev;
        }
        const next = prev.data.filter((l) => String(l.id) !== String(removedId));
        if (next.length === prev.data.length) {
          return prev;
        }
        return {
          ...prev,
          data: next,
          total: Math.max(0, (prev.total ?? next.length) - 1),
        };
      });
      setRefreshTrigger((prev) => prev + 1);
      setListToDelete(null);
    } catch (err) {
      console.error('Delete list error:', err);
      showToast('error', 'Failed to delete shopping list');
      setListToDelete(null);
    }
  };

  const handleDuplicateList = async (list: ShoppingList) => {
    try {
      const duplicated = await shoppingListService.duplicate(list.id, `${list.name} (Copy)`);
      showToast('success', 'Shopping list duplicated successfully');
      setRefreshTrigger(prev => prev + 1);
      navigation.navigate('ShoppingListDetail', { listId: duplicated.id });
    } catch (err) {
      showToast('error', 'Failed to duplicate shopping list');
    }
  };

  return (
    <ProtectedRoute resource="SHOPPING_LISTS" action="canView">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {(['all', 'active', 'inactive'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => handleTabChange(t)}
            >
              <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.textSecondary }]}>
                {t === 'all' ? 'All Lists' : t === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Filter Bar ── */}
        <SharedFilterBar
          searchValue={search}
          onSearchChange={handleSearch}
          searchPlaceholder="Search shopping lists..."
          onAction={permissions.canCreate ? handleCreateList : undefined}
        />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionRow}>
          <View style={styles.sectionLeft}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {tab === 'all' ? 'Shopping Lists' : tab === 'active' ? 'Active Lists' : 'Inactive Lists'}
            </Text>
            {total > 0 && (
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{total} found</Text>
            )}
          </View>
        </View>

        {error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Error Loading Lists"
            description="Please try again later"
            actionLabel="Retry"
            onAction={() => setRefreshTrigger((prev) => prev + 1)}
          />
        ) : loading && lists.length === 0 ? (
          <SkeletonList count={5} />
        ) : lists.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title="No Shopping Lists"
            description="Create your first shopping list to get started"
            actionLabel={permissions.canCreate ? "Create List" : undefined}
            onAction={permissions.canCreate ? handleCreateList : undefined}
          />
        ) : (
          <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {lists.map((list, idx) => (
              <ShoppingListRow
                key={list.id}
                list={list}
                isLast={idx === lists.length - 1}
                colors={colors}
                onPress={() => handleViewList(list)}
                onEdit={permissions.canEdit ? () => handleEditList(list) : undefined}
                onDuplicate={() => handleDuplicateList(list)}
                onDelete={permissions.canDelete ? () => handleDeleteList(list) : undefined}
                permissions={permissions}
              />
            ))}
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      )}

      {/* ── Delete List Confirmation ── */}
      <ConfirmModal
        visible={!!listToDelete}
        onCancel={() => setListToDelete(null)}
        title="Delete Shopping List"
        message={`Are you sure you want to delete "${listToDelete?.name}"?`}
        confirmText="Delete"
        onConfirm={confirmDeleteList}
        danger
      />
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1, paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1 },
  listContent: { padding: SPACING.md },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionLeft: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCount: { fontSize: 12 },


  listCard: {
    marginHorizontal: SPACING.sm,
    marginVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  listDescription: { fontSize: 14, marginBottom: SPACING.xs },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  itemsCount: {
    fontSize: 12,
    fontWeight: '600',
  },

  // New styles for list row
  listLeft: { flex: 1 },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  metaText: { fontSize: 12 },
});

// ─── Shopping List Row Component ─────────────────────────────────────────────
interface ShoppingListRowProps {
  list: ShoppingList;
  isLast: boolean;
  colors: any;
  onPress: () => void;
  onEdit?: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canInMenu: boolean;
  };
}

function ShoppingListRow({ list, isLast, colors, onPress, onEdit, onDuplicate, onDelete, permissions }: ShoppingListRowProps) {
  const getItemsCount = (row: ShoppingList) => {
    if (row.itemCount !== undefined && row.completedCount !== undefined) {
      return { total: row.itemCount, completed: row.completedCount };
    }

    const rowItems = row.items || [];
    const total = rowItems.length;
    const completed = rowItems.filter((item) => item.isCompleted).length;
    return { total, completed };
  };

  const getItemsCountText = (row: ShoppingList) => {
    const { total, completed } = getItemsCount(row);
    return `${completed}/${total} items`;
  };

  // Construir acciones del menú basadas en permisos
  const menuActions = [
    // Editar solo si tiene permisos y se proporcionó la función
    ...(permissions.canEdit && onEdit ? [{
      label: 'Edit',
      icon: 'create-outline' as const,
      onPress: onEdit,
    }] : []),
    // Duplicar siempre disponible si puede crear
    ...(permissions.canCreate ? [{
      label: 'Duplicate',
      icon: 'copy-outline' as const,
      onPress: onDuplicate,
    }] : []),
    // Eliminar solo si tiene permisos y se proporcionó la función
    ...(permissions.canDelete && onDelete ? [{
      label: 'Delete',
      icon: 'trash-outline' as const,
      onPress: onDelete,
      danger: true,
    }] : []),
  ];

  return (
    <TouchableOpacity
      style={[
        styles.listRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left side */}
      <View style={styles.listLeft}>
        <Text style={[styles.listTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {list.name}
        </Text>
        {list.description && (
          <Text style={[styles.listDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {list.description}
          </Text>
        )}
        <View style={styles.listMeta}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {getItemsCountText(list)}
          </Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            · {new Date(list.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Right side */}
      <View style={styles.listRight}>
        <View style={styles.badgesCol}>
          <StatusBadge label={list.isActive ? 'Active' : 'Inactive'} auto size="sm" />
        </View>
        {/* Solo mostrar menú si hay al menos una acción disponible */}
        {menuActions.length > 0 && (
          <ActionMenu actions={menuActions} />
        )}
      </View>
    </TouchableOpacity>
  );
}
