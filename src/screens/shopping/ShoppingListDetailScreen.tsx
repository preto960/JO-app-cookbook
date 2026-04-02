// @ts-nocheck
// src/screens/shopping/ShoppingListDetailScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable,
  RefreshControl, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDataRefresh } from '../../context/DataRefreshContext';
import { RADIUS, SPACING } from '../../constants/theme';
import { shoppingListService } from '../../services/api';
import type { ShoppingList, ShoppingListItem } from '../../types/api.types';

import { useApiQuery } from '../../hooks';
import {
  EmptyState, SkeletonList,
  ModalSheet, FormField, ConfirmModal, ActionMenu,
} from '../../components';

interface RouteParams {
  listId: string;
}

export default function ShoppingListDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { listId } = route.params as RouteParams;
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { triggerRefresh } = useDataRefresh();

  // ── State ──
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ShoppingListItem | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    quantity: '',
    unit: '',
    notes: '',
    category: '',
  });

  // ── API Call ──
  const {
    data: list,
    loading,
    error,
    refetch,
    setData,
  } = useApiQuery<ShoppingList>(
    () => shoppingListService.getById(listId, false),
    [listId, refreshTrigger]
  );

  const goBackToLists = useCallback(() => {
    navigation.navigate('ShoppingLists');
  }, [navigation]);

  const sortedItems = useMemo(() => {
    const raw = list?.items || [];
    return raw
      .filter((item) => item != null && item.id != null && String(item.id) !== '')
      .sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });
  }, [list?.items]);

  const handleShare = useCallback(async () => {
    if (!list) return;
    const itemCount = list.items?.length ?? 0;
    const completed =
      list.items?.filter((i) => Boolean(i.isCompleted)).length ?? 0;
    const parts: string[] = [list.name.trim()];
    if (list.description?.trim()) {
      parts.push(list.description.trim());
    }
    if (itemCount > 0) {
      parts.push(
        `${itemCount} item${itemCount === 1 ? '' : 's'} · ${completed} completed`
      );
    } else {
      parts.push('No items yet');
    }
    const shareText = parts.join('\n\n');
    try {
      await Share.share({ message: shareText, title: list.name });
    } catch (err) {
      console.error('Share error:', err);
    }
  }, [list]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: list?.name || 'Shopping List',
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBackToLists}
          activeOpacity={0.7}
          accessibilityLabel="Back to shopping lists"
        >
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, list, colors, goBackToLists, handleShare]);

  // ── Handlers ──
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleToggleItem = async (item: ShoppingListItem) => {
    if (!list) return;

    const itemKey = String(item.id);
    const wasDone = Boolean(item.isCompleted);
    const newCompletedState = !wasDone;

    const updatedItems = list.items?.map((i) =>
      String(i.id) === itemKey ? { ...i, isCompleted: newCompletedState } : i
    ) || [];

    const optimisticList = { ...list, items: updatedItems };
    setData(optimisticList);

    try {
      const updatedItem = await shoppingListService.toggleItemCompleted(listId, itemKey);

      const realUpdatedItems = list.items?.map((i) =>
        String(i.id) === itemKey ? { ...i, ...updatedItem, isCompleted: Boolean(updatedItem.isCompleted) } : i
      ) || [];

      setData({ ...list, items: realUpdatedItems });
      triggerRefresh('shoppingLists');
    } catch (err) {
      console.error('❌ Toggle item error:', err);
      await refetch();
      showToast('error', 'Failed to update item');
    }
  };

  const handleDeleteItem = async (item: ShoppingListItem) => {
    setItemToDelete(item);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete || !list) return;

    // Optimistic update - remove item immediately
    const updatedItems = list.items?.filter(i => i.id !== itemToDelete.id) || [];
    const optimisticList = { ...list, items: updatedItems };
    setData(optimisticList);

    try {
      await shoppingListService.deleteItem(listId, itemToDelete.id);
      showToast('success', 'Item removed');
      triggerRefresh('shoppingLists');
      setItemToDelete(null);
    } catch (err) {
      console.error('Delete item error:', err);
      // Revert optimistic update on error
      setData(list);
      showToast('error', 'Failed to remove item');
      setItemToDelete(null);
    }
  };

  const handleAddItem = async () => {
    if (!newItemForm.name.trim()) {
      showToast('error', 'Item name is required');
      return;
    }

    try {
      await shoppingListService.addItem(listId, {
        name: newItemForm.name.trim(),
        quantity: newItemForm.quantity.trim(),
        unit: newItemForm.unit.trim() || undefined,
        notes: newItemForm.notes.trim() || undefined,
        category: newItemForm.category.trim() || undefined,
      });
      
      setNewItemForm({ name: '', quantity: '', unit: '', notes: '', category: '' });
      setShowAddItem(false);
      showToast('success', 'Item added');
      setRefreshTrigger(prev => prev + 1);
      triggerRefresh('shoppingLists');
    } catch (err) {
      showToast('error', 'Failed to add item');
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !newItemForm.name.trim()) {
      showToast('error', 'Item name is required');
      return;
    }

    try {
      await shoppingListService.updateItem(listId, editingItem.id, {
        name: newItemForm.name.trim(),
        quantity: newItemForm.quantity.trim(),
        unit: newItemForm.unit.trim() || undefined,
        notes: newItemForm.notes.trim() || undefined,
        category: newItemForm.category.trim() || undefined,
      });
      
      setEditingItem(null);
      setNewItemForm({ name: '', quantity: '', unit: '', notes: '', category: '' });
      showToast('success', 'Item updated');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showToast('error', 'Failed to update item');
    }
  };

  const handleToggleAll = async (completed: boolean) => {
    try {
      await shoppingListService.toggleAllItems(listId, completed);
      showToast('success', completed ? 'All items marked as completed' : 'All items marked as pending');
      setRefreshTrigger(prev => prev + 1);
      triggerRefresh('shoppingLists');
    } catch (err) {
      showToast('error', 'Failed to update items');
    }
  };

  const handleClearCompleted = async () => {
    try {
      await shoppingListService.clearCompleted(listId);
      showToast('success', 'Completed items cleared');
      setShowConfirmClear(false);
      setRefreshTrigger(prev => prev + 1);
      triggerRefresh('shoppingLists');
    } catch (err) {
      showToast('error', 'Failed to clear completed items');
    }
  };

  const openAddItemModal = () => {
    setNewItemForm({ name: '', quantity: '', unit: '', notes: '', category: '' });
    setEditingItem(null);
    setShowAddItem(true);
  };

  const openEditItemModal = (item: ShoppingListItem) => {
    setNewItemForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || '',
      notes: item.notes || '',
      category: item.category || '',
    });
    setEditingItem(item);
    setShowAddItem(true);
  };

  const getProgress = () => {
    if (!list || sortedItems.length === 0) return 0;
    const completed = sortedItems.filter((item) => item.isCompleted).length;
    return Math.round((completed / sortedItems.length) * 100);
  };

  // ── Render ──
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={8} />
      </View>
    );
  }

  if (error || !list) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState
            icon="alert-circle-outline"
            title="Error Loading List"
            description="Please try again later"
            actionLabel="Retry"
            onAction={() => setRefreshTrigger(prev => prev + 1)}
          />
      </View>
    );
  }

  const progress = getProgress();
  const completedCount = sortedItems.filter((item) => item.isCompleted).length;
  const hasCompletedItems = completedCount > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header Info ── */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.listTitle, { color: colors.textPrimary }]}>{list.name}</Text>
          {list.description && (
            <Text style={[styles.listDescription, { color: colors.textSecondary }]}>
              {list.description}
            </Text>
          )}
          
          <View style={styles.progressRow}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.success, width: `${progress}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {completedCount}/{sortedItems.length} completed ({progress}%)
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primaryDim }]}
              onPress={() => handleToggleAll(true)}
            >
              <Ionicons name="checkmark-done" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Mark All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => handleToggleAll(false)}
            >
              <Ionicons name="remove" size={16} color={colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Clear All</Text>
            </TouchableOpacity>

            {hasCompletedItems && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.dangerDim }]}
                onPress={() => setShowConfirmClear(true)}
              >
                <Ionicons name="trash" size={16} color={colors.danger} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Clear Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: SPACING.sm, paddingBottom: SPACING.sm }}
      >
        <View style={{ height: SPACING.sm }} />
        {sortedItems.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title="No Items Yet"
            description="Add items to your shopping list"
            actionLabel="Add Item"
            onAction={openAddItemModal}
          />
        ) : (
          sortedItems.map((item) => {
            const done = Boolean(item.isCompleted);
            return (
              <View
                key={String(item.id)}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: done ? 0.6 : 1,
                  },
                ]}
              >
                <Pressable
                  style={styles.itemRowPressable}
                  onPress={() => handleToggleItem(item)}
                  android_ripple={{ color: `${colors.primary}22` }}
                >
                  <View style={styles.itemCheckbox}>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={done ? colors.success : colors.textMuted}
                    />
                  </View>

                  <View style={styles.itemContent}>
                    <Text
                      style={[
                        styles.itemName,
                        {
                          color: colors.textPrimary,
                          textDecorationLine: done ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>

                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemQuantity, { color: colors.textSecondary }]}>
                        {item.quantity} {item.unit}
                      </Text>
                      {item.category ? (
                        <View style={[styles.categoryBadge, { backgroundColor: colors.primaryDim }]}>
                          <Text style={[styles.categoryText, { color: colors.primary }]}>
                            {item.category}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {item.notes ? (
                      <Text style={[styles.itemNotes, { color: colors.textMuted }]}>
                        {item.notes}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>

                <View style={styles.itemMenuWrap}>
                  <ActionMenu
                    triggerStyle={{ marginRight: 0 }}
                    actions={[
                      {
                        label: 'Edit',
                        icon: 'create-outline',
                        onPress: () => openEditItemModal(item),
                      },
                      {
                        label: 'Delete',
                        icon: 'trash-outline',
                        onPress: () => handleDeleteItem(item),
                        danger: true,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: SPACING.sm }} />
      </ScrollView>

      {/* ── Add Item FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddItemModal}
      >
        <Ionicons name="add" size={24} color={colors.background} />
      </TouchableOpacity>

      {/* ── Add/Edit Item Modal ── */}
      <ModalSheet
        visible={showAddItem}
        onClose={() => {
          setShowAddItem(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Item' : 'Add Item'}
      >
        <FormField
          label="Item Name"
          value={newItemForm.name}
          onChangeText={(value) => setNewItemForm(prev => ({ ...prev, name: value }))}
          placeholder="e.g., Milk, Bread, Apples..."
          required
        />
        
        <View style={styles.formRow}>
          <View style={styles.quantityField}>
            <FormField
              label="Quantity"
              value={newItemForm.quantity}
              onChangeText={(value) => setNewItemForm(prev => ({ ...prev, quantity: value }))}
              placeholder="2, 1kg"
              style={styles.compactInput}
            />
          </View>
          <View style={styles.unitField}>
            <FormField
              label="Unit"
              value={newItemForm.unit}
              onChangeText={(value) => setNewItemForm(prev => ({ ...prev, unit: value }))}
              placeholder="kg, L"
              style={styles.compactInput}
            />
          </View>
        </View>

        <FormField
          label="Category"
          value={newItemForm.category}
          onChangeText={(value) => setNewItemForm(prev => ({ ...prev, category: value }))}
          placeholder="e.g., Dairy, Produce, Meat..."
        />

        <FormField
          label="Notes"
          value={newItemForm.notes}
          onChangeText={(value) => setNewItemForm(prev => ({ ...prev, notes: value }))}
          placeholder="Brand, special instructions..."
          multiline
          numberOfLines={2}
        />

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalBtn, styles.modalBtnSecondary, { borderColor: colors.border }]}
            onPress={() => {
              setShowAddItem(false);
              setEditingItem(null);
            }}
          >
            <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.primary }]}
            onPress={editingItem ? handleEditItem : handleAddItem}
          >
            <Text style={[styles.modalBtnText, { color: colors.background }]}>
              {editingItem ? 'Update' : 'Add Item'}
            </Text>
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* ── Clear Completed Confirmation ── */}
      <ConfirmModal
        visible={showConfirmClear}
        onCancel={() => setShowConfirmClear(false)}
        title="Clear Completed Items"
        message="This will permanently remove all completed items from the list."
        confirmText="Clear"
        onConfirm={handleClearCompleted}
        danger
      />

      {/* ── Delete Item Confirmation ── */}
      <ConfirmModal
        visible={!!itemToDelete}
        onCancel={() => setItemToDelete(null)}
        title="Delete Item"
        message={`Remove "${itemToDelete?.name}" from the list?`}
        confirmText="Delete"
        onConfirm={confirmDeleteItem}
        danger
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerContent: { gap: SPACING.sm },
  listTitle: { fontSize: 20, fontWeight: '700' },
  listDescription: { fontSize: 14 },
  
  progressRow: { gap: SPACING.xs },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600' },
  
  actionButtons: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  headerActions: { flexDirection: 'row', gap: SPACING.xs, marginRight: 16 },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { flex: 1, paddingHorizontal: SPACING.md },
  
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 0,
    marginVertical: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemMenuWrap: {
    justifyContent: 'center',
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  itemRowPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  itemCheckbox: { paddingTop: 2 },
  itemContent: { flex: 1, gap: 2 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  itemQuantity: { fontSize: 14, fontWeight: '500' },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  categoryText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  itemNotes: { fontSize: 12, fontStyle: 'italic' },
  

  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  formRow: { 
    flexDirection: 'row', 
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quantityField: { flex: 2 },
  unitField: { flex: 1 },
  compactInput: {
    marginBottom: 0, // Override FormField default margin
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modalBtnSecondary: { borderWidth: 1 },
  modalBtnPrimary: {},
  modalBtnText: { fontSize: 16, fontWeight: '600' },
});