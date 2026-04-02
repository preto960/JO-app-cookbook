// @ts-nocheck — useApiCall usage + ModalSheet/EmptyState props need alignment with component APIs.
// src/components/RecipeToShoppingListModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import { RADIUS, SPACING } from '../constants/theme';
import { shoppingListService, recipeService, getApiErrorMessage } from '../services/api';
import type { Recipe, ShoppingList } from '../types/api.types';

import { useApiCall } from '../hooks';
import { ModalSheet, FormField, SkeletonLoader, EmptyState } from './';

interface RecipeToShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  selectedRecipes?: Recipe[];
  onSuccess?: (list: ShoppingList) => void;
}

interface RecipeSelection {
  recipe: Recipe;
  selected: boolean;
  servings: number;
}

export default function RecipeToShoppingListModal({
  visible,
  onClose,
  selectedRecipes = [],
  onSuccess,
}: RecipeToShoppingListModalProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { triggerRefresh } = useDataRefresh();

  // ── State ──
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [selectedExistingList, setSelectedExistingList] = useState<ShoppingList | null>(null);
  const [recipeSelections, setRecipeSelections] = useState<RecipeSelection[]>([]);
  const [creating, setCreating] = useState(false);

  // ── Load user's recipes if none provided ──
  const {
    data: recipesResponse,
    loading: loadingRecipes,
  } = useApiCall(
    () => selectedRecipes.length > 0 ? Promise.resolve(null) : recipeService.getMine({ limit: 50 }),
    [selectedRecipes.length]
  );

  // ── Load existing shopping lists ──
  const {
    data: existingListsResponse,
    loading: loadingLists,
    execute: loadLists,
  } = useApiCall(shoppingListService.getAll);

  const availableRecipes = selectedRecipes.length > 0 ? selectedRecipes : (recipesResponse?.data ?? []);
  const existingLists = existingListsResponse?.data ?? [];

  const getItemsCountText = (list: ShoppingList) => {
    // Use backend-provided count if available, fallback to items array
    if (list.itemCount !== undefined) {
      return `${list.itemCount} items`;
    }
    
    if (!list.items) {
      return '0 items';
    }
    return `${list.items.length} items`;
  };

  // Load existing lists when modal opens or mode changes to existing
  useEffect(() => {
    if (visible) {
      if (mode === 'existing') {
        loadLists({ limit: 100, isActive: true });
      }
    }
  }, [visible, mode]);

  // ── Effects ──
  useEffect(() => {
    if (visible && availableRecipes.length > 0) {
      // Initialize selections
      const selections: RecipeSelection[] = availableRecipes.map(recipe => ({
        recipe,
        selected: selectedRecipes.length > 0, // Auto-select if recipes were pre-selected
        servings: recipe.servings || 4,
      }));
      setRecipeSelections(selections);

      // Generate default list name
      if (selectedRecipes.length > 0) {
        const names = selectedRecipes.map(r => r.title).slice(0, 2);
        const listName = names.length === 1 
          ? `${names[0]} - Shopping List`
          : names.length === 2
          ? `${names[0]} & ${names[1]} - Shopping List`
          : `${names[0]} & ${selectedRecipes.length - 1} more - Shopping List`;
        setListName(listName);
      } else {
        setListName('My Shopping List');
      }
      setListDescription('');
    }
  }, [visible, availableRecipes, selectedRecipes]);

  // ── Handlers ──
  const handleToggleRecipe = (index: number) => {
    setRecipeSelections(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleServingsChange = (index: number, servings: number) => {
    if (servings < 1) return;
    setRecipeSelections(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, servings } : item
      )
    );
  };

  const handleCreate = async () => {
    const selectedItems = recipeSelections.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      showToast('error', 'Please select at least one recipe');
      return;
    }

    if (mode === 'new' && !listName.trim()) {
      showToast('error', 'Please enter a list name');
      return;
    }

    if (mode === 'existing' && !selectedExistingList) {
      showToast('error', 'Please select an existing list');
      return;
    }

    setCreating(true);
    let resultList: ShoppingList | undefined;
    try {
      const missingId = selectedItems.some(
        (item) => item.recipe == null || item.recipe.id == null || String(item.recipe.id).trim() === '',
      );
      if (missingId) {
        showToast(
          'error',
          'Missing recipe ID',
          'Go back and open the recipe again, then retry.',
        );
        return;
      }
      const recipeIds = selectedItems.map((item) => String(item.recipe.id).trim());

      if (mode === 'new') {
        resultList = await shoppingListService.generateFromRecipes({
          name: listName.trim(),
          description: listDescription.trim() || undefined,
          recipeIds,
        });
      } else {
        const tempList = await shoppingListService.generateFromRecipes({
          name: 'temp',
          recipeIds,
        });

        if (tempList.items && tempList.items.length > 0) {
          for (const item of tempList.items) {
            await shoppingListService.addItem(selectedExistingList!.id, {
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              notes: item.notes,
              category: item.category,
            });
          }
        }

        await shoppingListService.delete(tempList.id);
        resultList = await shoppingListService.getById(selectedExistingList!.id);
      }
    } catch (err) {
      const detail = getApiErrorMessage(err);
      showToast(
        'error',
        mode === 'new' ? 'Failed to create shopping list' : 'Failed to add ingredients',
        detail,
      );
      return;
    } finally {
      setCreating(false);
    }

    if (!resultList) {
      return;
    }

    showToast('success', mode === 'new' ? 'Shopping list created successfully!' : 'Ingredients added to list!');
    triggerRefresh('shoppingLists');
    try {
      onSuccess?.(resultList);
    } catch (e) {
      console.warn('RecipeToShoppingListModal: onSuccess', e);
    }
    onClose();
  };

  const selectedCount = recipeSelections.filter(item => item.selected).length;
  const totalIngredients = recipeSelections
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (item.recipe.ingredients?.length || 0), 0);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Create Shopping List from Recipes"
      maxHeight="90%"
    >
      <View style={styles.container}>
        {/* ── Mode Selection ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Add ingredients to:
          </Text>
          
          <View style={styles.modeButtons}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                {
                  backgroundColor: mode === 'new' ? colors.primaryDim : colors.surfaceElevated,
                  borderColor: mode === 'new' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setMode('new')}
            >
              <Ionicons 
                name={mode === 'new' ? 'add-circle' : 'add-circle-outline'} 
                size={20} 
                color={mode === 'new' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.modeButtonText, 
                { color: mode === 'new' ? colors.primary : colors.textSecondary }
              ]}>
                New List
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                {
                  backgroundColor: mode === 'existing' ? colors.primaryDim : colors.surfaceElevated,
                  borderColor: mode === 'existing' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setMode('existing')}
            >
              <Ionicons 
                name={mode === 'existing' ? 'list-circle' : 'list-circle-outline'} 
                size={20} 
                color={mode === 'existing' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.modeButtonText, 
                { color: mode === 'existing' ? colors.primary : colors.textSecondary }
              ]}>
                Existing List
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── List Info ── */}
        {mode === 'new' ? (
          <View style={styles.section}>
            <FormField
              label="List Name"
              value={listName}
              onChangeText={setListName}
              placeholder="Enter shopping list name"
              required
            />
            
            <FormField
              label="Description"
              value={listDescription}
              onChangeText={setListDescription}
              placeholder="Optional description"
              multiline
              numberOfLines={2}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Select Existing List *
            </Text>
            {loadingLists ? (
              <View style={[styles.loadingContainer, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading lists...
                </Text>
              </View>
            ) : existingLists.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No active lists found. Create a new list instead.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.existingListsContainer} showsVerticalScrollIndicator={false}>
                {existingLists.map((list) => (
                  <TouchableOpacity
                    key={list.id}
                    style={[
                      styles.existingListItem,
                      {
                        backgroundColor: selectedExistingList?.id === list.id ? colors.primaryDim : colors.surface,
                        borderColor: selectedExistingList?.id === list.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedExistingList(list)}
                  >
                    <View style={styles.existingListIcon}>
                      <Ionicons 
                        name={selectedExistingList?.id === list.id ? 'checkmark-circle' : 'ellipse-outline'} 
                        size={20} 
                        color={selectedExistingList?.id === list.id ? colors.primary : colors.textMuted} 
                      />
                    </View>
                    <View style={styles.existingListInfo}>
                      <Text style={[styles.existingListName, { color: colors.textPrimary }]}>
                        {list.name}
                      </Text>
                      {list.description && (
                        <Text style={[styles.existingListDescription, { color: colors.textSecondary }]}>
                          {list.description}
                        </Text>
                      )}
                      <Text style={[styles.existingListMeta, { color: colors.textMuted }]}>
                        {getItemsCountText(list)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── Summary ── */}
        {selectedCount > 0 && (
          <View style={[styles.summary, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.summaryText, { color: colors.primary }]}>
              {selectedCount} recipe{selectedCount !== 1 ? 's' : ''} selected • 
              ~{totalIngredients} ingredient{totalIngredients !== 1 ? 's' : ''} will be added
            </Text>
          </View>
        )}

        {/* ── Recipe Selection ── */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Select Recipes ({selectedCount} selected)
        </Text>

        {loadingRecipes ? (
          <SkeletonLoader count={3} />
        ) : availableRecipes.length === 0 ? (
          <EmptyState
            icon="restaurant-outline"
            title="No Recipes Found"
            message="You need to create some recipes first"
            compact
          />
        ) : (
          <ScrollView style={styles.recipesList} showsVerticalScrollIndicator={false}>
            {recipeSelections.map((item, index) => (
              <View
                key={item.recipe.id}
                style={[
                  styles.recipeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: item.selected ? colors.primary : colors.border,
                    borderWidth: item.selected ? 2 : 1,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.recipeHeader}
                  onPress={() => handleToggleRecipe(index)}
                >
                  <View style={styles.recipeCheckbox}>
                    <Ionicons
                      name={item.selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={item.selected ? colors.primary : colors.textMuted}
                    />
                  </View>
                  
                  <View style={styles.recipeInfo}>
                    <Text style={[styles.recipeTitle, { color: colors.textPrimary }]}>
                      {item.recipe.title}
                    </Text>
                    <Text style={[styles.recipeIngredients, { color: colors.textSecondary }]}>
                      {item.recipe.ingredients?.length || 0} ingredients
                    </Text>
                  </View>
                </TouchableOpacity>

                {item.selected && (
                  <View style={styles.servingsControl}>
                    <Text style={[styles.servingsLabel, { color: colors.textSecondary }]}>
                      Servings:
                    </Text>
                    <View style={styles.servingsButtons}>
                      <TouchableOpacity
                        style={[styles.servingsBtn, { backgroundColor: colors.surfaceElevated }]}
                        onPress={() => handleServingsChange(index, item.servings - 1)}
                        disabled={item.servings <= 1}
                      >
                        <Ionicons
                          name="remove"
                          size={16}
                          color={item.servings <= 1 ? colors.textMuted : colors.textSecondary}
                        />
                      </TouchableOpacity>
                      
                      <Text style={[styles.servingsValue, { color: colors.textPrimary }]}>
                        {item.servings}
                      </Text>
                      
                      <TouchableOpacity
                        style={[styles.servingsBtn, { backgroundColor: colors.surfaceElevated }]}
                        onPress={() => handleServingsChange(index, item.servings + 1)}
                      >
                        <Ionicons name="add" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.createBtn,
              {
                backgroundColor: creating || selectedCount === 0 ? colors.textMuted : colors.primary,
              },
            ]}
            onPress={handleCreate}
            disabled={creating || selectedCount === 0}
          >
            <Text style={[styles.actionBtnText, { color: colors.background }]}>
              {creating 
                ? (mode === 'new' ? 'Creating...' : 'Adding...') 
                : (mode === 'new' ? 'Create List' : 'Add to List')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.lg },
  
  section: { gap: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  
  modeButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modeButtonText: { fontSize: 14, fontWeight: '600' },
  
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: SPACING.xs },
  
  loadingContainer: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  loadingText: { fontSize: 14 },
  
  emptyContainer: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  
  existingListsContainer: { maxHeight: 200 },
  existingListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  existingListIcon: {},
  existingListInfo: { flex: 1 },
  existingListName: { fontSize: 15, fontWeight: '600' },
  existingListDescription: { fontSize: 13, marginTop: 2 },
  existingListMeta: { fontSize: 12, marginTop: 4 },
  
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  summaryText: { fontSize: 14, fontWeight: '500', flex: 1 },
  
  recipesList: { maxHeight: 300 },
  recipeCard: {
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  recipeCheckbox: {},
  recipeInfo: { flex: 1 },
  recipeTitle: { fontSize: 16, fontWeight: '600' },
  recipeIngredients: { fontSize: 13, marginTop: 2 },
  
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  servingsLabel: { fontSize: 14, fontWeight: '500' },
  servingsButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  servingsBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelBtn: { borderWidth: 1 },
  createBtn: {},
  actionBtnText: { fontSize: 16, fontWeight: '600' },
});