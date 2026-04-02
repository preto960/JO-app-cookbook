// src/screens/recipes/RecipesScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { recipeService, resolvePublicMediaUrl } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { useApiCall } from '../../hooks/useApiCall';
import { StatusBadge, EmptyState, SkeletonCard, SkeletonList, Pagination, ActionMenu, ModalSheet, RecipeToShoppingListModal } from '../../components';
import SharedFilterBar from '../../components/SharedFilterBar';
import { SPACING, RADIUS } from '../../constants/theme';
import type { Recipe, RecipeCategory, ShoppingList } from '../../types/api.types';

type Tab = 'explore' | 'mine' | 'favourites';

const DIFFICULTY_CHIPS = [
  { label: 'All',    value: null },
  { label: 'Easy',   value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard',   value: 'hard' },
];

interface Props { navigation: any }

function RecipesScreenContent({ navigation }: Props) {
  const { colors } = useTheme();
  const toast      = useToast();

  const [tab,        setTab]        = useState<Tab>('explore');
  const [search,     setSearch]     = useState('');
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);

  // Calcular parámetros iniciales basados en el tab inicial
  const getInitialParams = () => {
    const initialTab = 'explore'; // Debe coincidir con useState inicial
    return {
      ...(initialTab === 'explore' ? { isPublished: true } : {}),
    };
  };

  // Local filter states for modal
  const [tempDifficulty, setTempDifficulty] = useState<string | null>(null);
  const [tempCategoryId, setTempCategoryId] = useState<string | null>(null);

  const { execute: loadCategories } = useApiCall(recipeService.getCategories, {
    onSuccess: (cats) => setCategories(Array.isArray(cats) ? cats : []),
  });

  const { execute: togglePublish } = useApiCall(recipeService.togglePublish, {
    onError: (e) => toast.error('Action failed', e),
  });

  const { execute: deleteRecipe } = useApiCall(recipeService.delete, {
    onError: (e) => toast.error('Delete failed', e),
  });

  useEffect(() => {
    loadCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función API unificada que selecciona el endpoint correcto
  const apiFunction = useCallback((params: any) => {
    if (tab === 'explore') {
      return recipeService.getAll(params);
    }
    if (tab === 'mine') {
      return recipeService.getMine(params);
    }
    return recipeService.getFavourites(params);
  }, [tab]);

  const {
    items, loading, page, totalPages, total,
    loadPage, refresh, refreshWithParams, reset,
  } = usePagination<Recipe, any>({
    apiFunction,
    pageSize: 12,
    initialParams: getInitialParams(),
    initialFetch: 'manual',
    onError: (e) => {
      toast.error('Load failed', e);
    },
  });

  const listData = useMemo(
    () => items.filter((recipe) => recipe && recipe.id),
    [items],
  );

  // Función estable para construir parámetros
  const buildParams = useCallback(() => ({
    ...(search     ? { search }     : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(tab === 'explore' ? { isPublished: true } : {}),
  }), [search, difficulty, categoryId, tab]);

  // Cargar datos cuando la pantalla viene al foco
  useFocusEffect(
    useCallback(() => {
      const params = buildParams();
      refreshWithParams(params);
    }, [buildParams, refreshWithParams])
  );

  const handleTabChange = useCallback((t: Tab) => {
    try {
      setTab(t);
      setSearch('');
      setDifficulty(null);
      setCategoryId(null);

      // Resetear el hook de paginación para limpiar datos anteriores
      reset();
    } catch (error) {
      console.error('Error in handleTabChange:', error);
      toast.error('Tab change failed', 'Please try again');
    }
  }, [reset, toast]);

  // Build category chips dynamically
  const categoryChips = [
    { label: 'All categories', value: null },
    ...categories.map(c => ({ label: c.name, value: c.id })),
  ];

  const handleTogglePublish = useCallback(async (recipe: Recipe) => {
    const result = await togglePublish(recipe.id);
    if (result) {
      toast.success(result.isPublished ? 'Recipe published' : 'Recipe unpublished');
      refresh(); // Trigger reload
    }
  }, [togglePublish, refresh, toast]);

  const handleDelete = useCallback(async (recipe: Recipe) => {
    await deleteRecipe(recipe.id);
    toast.success('Recipe deleted');
    refresh(); // Trigger reload
  }, [deleteRecipe, refresh, toast]);

  const applyModalFilters = useCallback(() => {
    setDifficulty(tempDifficulty);
    setCategoryId(tempCategoryId);
    setFiltersOpen(false);
  }, [tempDifficulty, tempCategoryId]);

  const clearFilters = useCallback(() => {
    setTempDifficulty(null);
    setTempCategoryId(null);
  }, []);

  // Shopping List handlers
  const handleCreateShoppingList = useCallback(() => {
    setSelectedRecipes([]);
    setShowShoppingListModal(true);
  }, []);

  const handleShoppingListSuccess = useCallback((list: ShoppingList) => {
    navigation.navigate('ShoppingListDetail', { listId: list.id });
  }, [navigation]);

  // For mine tab: show list view (like users)
  const showListView = tab === 'mine' || tab === 'favourites';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['explore', 'mine', 'favourites'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => handleTabChange(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.textSecondary }]}>
              {t === 'explore' ? 'Explore' : t === 'mine' ? 'Mine' : 'Favourites'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter bar — search + filter button + action */}
      <SharedFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search recipes…"
        onAction={tab === 'mine' ? () => navigation.navigate('RecipeForm') : undefined}
        onFilter={() => {
          // Sync temp states with current filters
          setTempDifficulty(difficulty);
          setTempCategoryId(categoryId);
          setFiltersOpen(true);
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={loading && items.length > 0}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.sectionRow}>
          <View style={styles.sectionLeft}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {tab === 'explore' ? 'Recipes' : tab === 'mine' ? 'My recipes' : 'Favourites'}
            </Text>
            {total > 0 && (
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{total} found</Text>
            )}
          </View>

          {listData.length > 0 && (
            <TouchableOpacity
              style={[styles.shoppingListBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
              onPress={handleCreateShoppingList}
            >
              <Ionicons name="list" size={16} color={colors.primary} />
              <Text style={[styles.shoppingListBtnText, { color: colors.primary }]}>
                Shopping List
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && items.length === 0 ? (
          showListView ? (
            <SkeletonList count={5} />
          ) : (
            <View style={styles.grid}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={styles.gridItem}><SkeletonCard /></View>
              ))}
            </View>
          )
        ) : listData.length === 0 ? (
          <EmptyState
            type={search ? 'search' : 'empty'}
            icon="restaurant-outline"
            title={search ? 'No recipes found' : tab === 'mine' ? 'No recipes yet' : 'Nothing here yet'}
            description={
              search ? `No results for "${search}"`
                : tab === 'mine' ? 'Tap + to create your first recipe.'
                : undefined
            }
          />
        ) : showListView ? (
          <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {listData.map((recipe, idx) => (
              <RecipeListRow
                key={recipe.id}
                recipe={recipe}
                isLast={idx === listData.length - 1}
                showEdit={tab === 'mine'}
                colors={colors}
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                onEdit={() => navigation.navigate('RecipeForm', { recipeId: recipe.id })}
                onTogglePublish={() => handleTogglePublish(recipe)}
                onDelete={() => handleDelete(recipe)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {listData.map(recipe => (
              <View key={recipe.id} style={styles.gridItem}>
                <RecipeCard
                  recipe={recipe}
                  colors={colors}
                  onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                />
              </View>
            ))}
          </View>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPage={loadPage} />
        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Filters Modal */}
      <ModalSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        compact
        primaryLabel="Apply"
        onPrimary={applyModalFilters}
      >
        {/* Difficulty Filter */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>DIFFICULTY</Text>
          <View style={styles.filterChips}>
            {DIFFICULTY_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip.value ?? 'all'}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: tempDifficulty === chip.value ? colors.primaryDim : colors.surfaceElevated,
                    borderColor: tempDifficulty === chip.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTempDifficulty(chip.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: tempDifficulty === chip.value ? colors.primary : colors.textPrimary },
                ]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
          <View style={styles.filterChips}>
            {categoryChips.map((chip) => (
              <TouchableOpacity
                key={chip.value ?? 'all'}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: tempCategoryId === chip.value ? colors.primaryDim : colors.surfaceElevated,
                    borderColor: tempCategoryId === chip.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTempCategoryId(chip.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: tempCategoryId === chip.value ? colors.primary : colors.textPrimary },
                ]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Clear Filters */}
        <TouchableOpacity
          style={[styles.clearButton, { borderColor: colors.border }]}
          onPress={clearFilters}
        >
          <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Clear all filters</Text>
        </TouchableOpacity>
      </ModalSheet>

      {/* Shopping List Modal */}
      <RecipeToShoppingListModal
        visible={showShoppingListModal}
        onClose={() => setShowShoppingListModal(false)}
        selectedRecipes={selectedRecipes}
        onSuccess={handleShoppingListSuccess}
      />
    </View>
  );
}

// ─── Recipe List Row (like user row) ─────────────────────────────────────────
function RecipeListRow({
  recipe, isLast, showEdit, colors, onPress, onEdit, onTogglePublish, onDelete,
}: {
  recipe: Recipe; isLast: boolean; showEdit: boolean;
  colors: any; onPress: () => void; onEdit: () => void;
  onTogglePublish: () => void; onDelete: () => void;
}) {
  // Protección contra datos corruptos
  if (!recipe || !recipe.id) {
    return null;
  }

  const menuActions = [];

  if (showEdit) {
    menuActions.push(
      { label: 'Edit', icon: 'pencil-outline' as const, onPress: onEdit },
      {
        label: recipe.isPublished ? 'Unpublish' : 'Publish',
        icon: recipe.isPublished ? 'eye-off-outline' as const : 'eye-outline' as const,
        onPress: onTogglePublish,
      },
      { label: 'Delete', icon: 'trash-outline' as const, danger: true, onPress: onDelete }
    );
  }

  const thumbUri = resolvePublicMediaUrl(recipe.coverImage);

  return (
    <TouchableOpacity
      style={[
        styles.listRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Cover thumbnail */}
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.listThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.listThumbPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="restaurant-outline" size={18} color={colors.textMuted} />
        </View>
      )}

      {/* Info */}
      <View style={styles.listInfo}>
        <Text style={[styles.listTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {recipe.title || 'Untitled Recipe'}
        </Text>
        <View style={styles.listMeta}>
          {recipe.prepTimeMin != null && recipe.prepTimeMin > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.prepTimeMin}m</Text>
            </View>
          )}
          {recipe.category?.name && (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>· {recipe.category.name}</Text>
          )}
        </View>
      </View>

      {/* Right side */}
      <View style={styles.listRight}>
        <View style={styles.badgesCol}>
          <StatusBadge label={recipe.difficulty} auto size="sm" />
          {!recipe.isPublished && <StatusBadge label="draft" auto size="sm" />}
          {recipe.isFavourited && <Ionicons name="heart" size={12} color={colors.danger} />}
        </View>
        {menuActions.length > 0 && (
          <ActionMenu actions={menuActions} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Rating Star Component ────────────────────────────────────────────────────
function RatingStar({ rating, colors }: { rating: number; colors: any }) {
  // Protección contra valores inválidos
  const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
  // Convert rating (0-5) to percentage (0-100%)
  const percentage = Math.min(Math.max(safeRating / 5 * 100, 0), 100);

  return (
    <View style={styles.starContainer}>
      {/* Background star (empty) */}
      <Ionicons
        name="star-outline"
        size={14}
        color={colors.textMuted}
        style={styles.starBackground}
      />
      {/* Foreground star (filled) with clipping */}
      <View style={[styles.starForeground, { width: `${percentage}%` }]}>
        <Ionicons
          name="star"
          size={14}
          color="#F59E0B"
        />
      </View>
    </View>
  );
}

// ─── Recipe Card (grid) ───────────────────────────────────────────────────────
function RecipeCard({
  recipe, onPress, colors,
}: {
  recipe: Recipe; onPress: () => void; colors: any;
}) {
  // Protección contra datos corruptos
  if (!recipe || !recipe.id) {
    return null;
  }

  const coverUri = resolvePublicMediaUrl(recipe.coverImage);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={styles.coverImg} resizeMode="cover" />
      ) : (
        <View style={[styles.coverPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="restaurant-outline" size={26} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {recipe.title || 'Untitled Recipe'}
        </Text>
        <View style={styles.cardMeta}>
          {recipe.prepTimeMin != null && recipe.prepTimeMin > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.prepTimeMin}m</Text>
            </View>
          )}
          {recipe.servings != null && recipe.servings > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.servings}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardBadges}>
            <StatusBadge label={recipe.difficulty} auto size="sm" />
            {!recipe.isPublished && <StatusBadge label="draft" auto size="sm" />}
            {recipe.isFavourited && <Ionicons name="heart" size={12} color={colors.danger} />}
          </View>
          {/* Rating star - show only if there are ratings */}
          {Number(recipe.ratingCount) > 0 &&
            typeof recipe.averageRating === 'number' &&
            !Number.isNaN(recipe.averageRating) && (
            <View style={styles.cardRating}>
              <RatingStar rating={recipe.averageRating} colors={colors} />
              <Text style={[styles.cardRatingText, { color: colors.textSecondary }]}>
                {Math.round((recipe.averageRating / 5) * 100)}%
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    /* alignItems: 'center',
    justifyContent: 'center', */
   },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1, paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },

  scroll:      { flex: 1 },
  listContent: { padding: SPACING.md },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionLeft: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionCount: { fontSize: 12 },

  shoppingListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  shoppingListBtnText: { fontSize: 12, fontWeight: '600' },

  // List view (mine/favourites)
  listCard: {
    borderRadius: RADIUS.lg, borderWidth: 1,
    overflow: 'hidden', marginBottom: SPACING.md,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    gap: 10,
  },
  listThumb: {
    width: 44, height: 44, borderRadius: RADIUS.sm,
    flexShrink: 0,
  },
  listThumbPlaceholder: {
    width: 44, height: 44, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  listInfo:  { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 14, fontWeight: '600' },
  listMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  listRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  badgesCol: { gap: 3, alignItems: 'flex-end' },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%' },

  card:             { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  coverImg:         { width: '100%', height: 100, alignSelf: 'stretch' },
  coverPlaceholder: { width: '100%', height: 100, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  cardBody:         { padding: SPACING.sm },
  cardTitle:        { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 5 },
  cardMeta:         { flexDirection: 'row', gap: 8, marginBottom: 6 },
  metaItem:         { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText:         { fontSize: 11 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBadges: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, flexWrap: 'wrap' },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  cardRatingText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Rating Star
  starContainer: {
    position: 'relative',
    width: 14,
    height: 14,
  },
  starBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  starForeground: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },

  // Filter Modal
  filterSection: { marginBottom: SPACING.lg },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: SPACING.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default function RecipesScreen(props: Props) {
  return <RecipesScreenContent {...props} />;
}
