// src/screens/recipes/RecipesScreen.tsx
// Three-tab recipe list: Explore · My Recipes · Favourites.
// Includes search, difficulty filter, category filter.
// Cross-platform: web, iOS, Android.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { recipeService } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { useApiCall } from '../../hooks/useApiCall';
import {
  SearchBar, FilterBar, StatusBadge, EmptyState,
  SkeletonCard, Pagination, SectionHeader,
} from '../../components';
import { SPACING, RADIUS } from '../../constants/theme';
import type { Recipe, RecipeCategory, FilterOption } from '../../types/api.types';

type Tab = 'explore' | 'mine' | 'favourites';

const DIFFICULTY_FILTERS: FilterOption[] = [
  { label: 'Easy',   value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard',   value: 'hard' },
];

interface Props { navigation: any }

export default function RecipesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const toast      = useToast();

  const [tab,        setTab]        = useState<Tab>('explore');
  const [search,     setSearch]     = useState('');
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);

  const { execute: loadCategories } = useApiCall(recipeService.getCategories, {
    onSuccess: (cats) => setCategories(cats),
  });

  useEffect(() => { loadCategories(); }, []);

  const apiFn = tab === 'explore'     ? recipeService.getAll
              : tab === 'mine'        ? recipeService.getMine
              : recipeService.getFavourites;

  const {
    items, loading, page, totalPages, total,
    loadPage, refresh, setParams,
  } = usePagination<Recipe, any>({
    apiFunction: apiFn as any,
    pageSize: 12,
    onError: (e) => toast.error('Load failed', e),
  });

  // Sync filters
  useEffect(() => {
    setParams({
      ...(search     ? { search }     : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(categoryId ? { categoryId } : {}),
    });
  }, [search, difficulty, categoryId]);

  useEffect(() => { refresh(); }, [search, difficulty, categoryId, tab]);

  const categoryFilters: FilterOption[] = categories.map(c => ({ label: c.name, value: c.id }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['explore', 'mine', 'favourites'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.textSecondary }]}>
              {t === 'explore' ? 'Explore' : t === 'mine' ? 'My recipes' : 'Favourites'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filterArea}>
        <SearchBar placeholder="Search recipes…" onSearch={setSearch} />
        {tab === 'explore' && (
          <>
            <FilterBar options={DIFFICULTY_FILTERS} value={difficulty} onChange={setDifficulty} allLabel="All difficulties" />
            {categories.length > 0 && (
              <FilterBar options={categoryFilters} value={categoryId} onChange={setCategoryId} allLabel="All categories" />
            )}
          </>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <SectionHeader
          title={tab === 'explore' ? 'Recipes' : tab === 'mine' ? 'My recipes' : 'Favourites'}
          subtitle={total > 0 ? `${total} found` : undefined}
          rightElement={tab === 'mine' ? (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('RecipeForm')}
            >
              <Ionicons name="add" size={18} color={colors.background} />
              <Text style={[styles.addLabel, { color: colors.background }]}>New</Text>
            </TouchableOpacity>
          ) : undefined}
        />

        {loading && items.length === 0
          ? <View style={styles.grid}>{[1,2,3,4].map(i => <View key={i} style={styles.gridItem}><SkeletonCard /></View>)}</View>
          : items.length === 0
          ? <EmptyState
              type={search ? 'search' : 'empty'}
              icon="restaurant-outline"
              title={search ? 'No recipes found' : tab === 'mine' ? 'No recipes yet' : 'Nothing here yet'}
              description={search ? `No results for "${search}"` : tab === 'mine' ? 'Create your first recipe.' : undefined}
              actionLabel={tab === 'mine' && !search ? 'New recipe' : undefined}
              onAction={tab === 'mine' && !search ? () => navigation.navigate('RecipeForm') : undefined}
            />
          : (
            <View style={styles.grid}>
              {items.map(recipe => (
                <View key={recipe.id} style={styles.gridItem}>
                  <RecipeCard recipe={recipe} onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })} colors={colors} />
                </View>
              ))}
            </View>
          )
        }

        <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPage={loadPage} />
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

// ─── Recipe card ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onPress, colors }: { recipe: Recipe; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Cover */}
      {recipe.coverImage
        ? <Image source={{ uri: recipe.coverImage }} style={styles.coverImg} />
        : <View style={[styles.coverPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
          </View>
      }

      {/* Content */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {recipe.title}
        </Text>

        <View style={styles.cardMeta}>
          {recipe.prepTimeMin && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.prepTimeMin}m</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.servings}</Text>
            </View>
          )}
          {typeof recipe.avgRating === 'number' && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.avgRating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <StatusBadge label={recipe.difficulty} auto size="sm" />
          {!recipe.isPublished && <StatusBadge label="draft" auto size="sm" />}
          {recipe.isFavourited && <Ionicons name="heart" size={14} color={colors.danger} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1, paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  filterArea: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: 8 },
  scroll:     { flex: 1 },
  content:    { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47%', flexGrow: 1 },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  coverImg:         { width: '100%', height: 110 },
  coverPlaceholder: { width: '100%', height: 110, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: SPACING.sm },
  cardTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontSize: 11 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7 },
  addLabel: { fontSize: 13, fontWeight: '700' },
});
