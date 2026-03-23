// src/screens/recipes/RecipesScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Image, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { recipeService } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { useApiCall } from '../../hooks/useApiCall';
import { StatusBadge, EmptyState, SkeletonCard, Pagination } from '../../components';
import { SPACING, RADIUS } from '../../constants/theme';
import type { Recipe, RecipeCategory, FilterOption } from '../../types/api.types';

type Tab = 'explore' | 'mine' | 'favourites';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

interface Props { navigation: any }

export default function RecipesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const toast      = useToast();

  const [tab,        setTab]        = useState<Tab>('explore');
  const [search,     setSearch]     = useState('');
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);

  const { execute: loadCategories } = useApiCall(recipeService.getCategories, {
    onSuccess: (cats) => setCategories(Array.isArray(cats) ? cats : []),
  });

  useEffect(() => { loadCategories(); }, []);

  const apiFn = tab === 'explore'
    ? recipeService.getAll
    : tab === 'mine'
    ? recipeService.getMine
    : recipeService.getFavourites;

  const {
    items: rawItems, loading, page, totalPages, total,
    loadPage, refresh, setParams,
  } = usePagination<Recipe, any>({
    apiFunction: apiFn as any,
    pageSize: 12,
    onError: (e) => toast.error('Load failed', e),
  });

  const items = Array.isArray(rawItems) ? rawItems : [];

  useEffect(() => {
    setParams({
      ...(search     ? { search }                            : {}),
      ...(difficulty ? { difficulty: difficulty.toLowerCase() } : {}),
      ...(categoryId ? { categoryId }                        : {}),
    });
  }, [search, difficulty, categoryId]);

  useEffect(() => { refresh(); }, [search, difficulty, categoryId, tab]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSearch('');
    setDifficulty(null);
    setCategoryId(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Tabs compactos */}
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

      {/* Buscador + botón nuevo */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={15} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
            placeholder="Search recipes…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {tab === 'mine' && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('RecipeForm')}
          >
            <Ionicons name="add" size={18} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros — solo en Explore */}
      {tab === 'explore' && (
        <View style={[styles.filtersRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <TouchableOpacity
              style={[styles.chip, !difficulty && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setDifficulty(null)}
            >
              <Text style={[styles.chipText, { color: !difficulty ? colors.background : colors.textSecondary }]}>
                All
              </Text>
            </TouchableOpacity>
            {DIFFICULTIES.map(d => {
              const active = difficulty === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setDifficulty(active ? null : d)}
                >
                  <Text style={[styles.chipText, { color: active ? colors.background : colors.textSecondary }]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
            {categories.map(c => {
              const active = categoryId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => setCategoryId(active ? null : c.id)}
                >
                  <Text style={[styles.chipText, { color: active ? colors.background : colors.textSecondary }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Lista */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={loading && items.length > 0} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Header sección */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {tab === 'explore' ? 'Recipes' : tab === 'mine' ? 'My recipes' : 'Favourites'}
          </Text>
          {total > 0 && (
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{total} found</Text>
          )}
        </View>

        {loading && items.length === 0 ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map(i => <View key={i} style={styles.gridItem}><SkeletonCard /></View>)}
          </View>
        ) : items.length === 0 ? (
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
        ) : (
          <View style={styles.grid}>
            {items.map(recipe => (
              <View key={recipe.id} style={styles.gridItem}>
                <RecipeCard
                  recipe={recipe}
                  showActions={tab === 'mine' && recipe.createdBy?.id === user?.id?.toString()}
                  onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                  onEdit={() => navigation.navigate('RecipeForm', { recipeId: recipe.id })}
                  colors={colors}
                />
              </View>
            ))}
          </View>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPage={loadPage} />
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────
function RecipeCard({
  recipe, onPress, onEdit, showActions, colors,
}: {
  recipe: Recipe; onPress: () => void; onEdit: () => void;
  showActions: boolean; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Cover */}
      {recipe.coverImage ? (
        <Image source={{ uri: recipe.coverImage }} style={styles.coverImg} resizeMode="cover" />
      ) : (
        <View style={[styles.coverPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="restaurant-outline" size={26} color={colors.textMuted} />
        </View>
      )}

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Meta row */}
        <View style={styles.cardMeta}>
          {recipe.prepTimeMin != null && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.prepTimeMin}m</Text>
            </View>
          )}
          {recipe.servings != null && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.servings}</Text>
            </View>
          )}
          {typeof recipe.avgRating === 'number' && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.avgRating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.cardBadges}>
            <StatusBadge label={recipe.difficulty} auto size="sm" />
            {!recipe.isPublished && <StatusBadge label="draft" auto size="sm" />}
            {recipe.isFavourited && <Ionicons name="heart" size={12} color={colors.danger} />}
          </View>

          {/* Botón editar en mis recetas */}
          {showActions && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onEdit(); }}
              style={[styles.editBtn, { backgroundColor: colors.surfaceElevated }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="pencil-outline" size={13} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1, paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 38, borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.sm, gap: 6,
  },
  input: { flex: 1, fontSize: 13 },
  addBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },

  filtersRow: { borderBottomWidth: 1 },
  chips: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
  },
  chip: {
    borderRadius: RADIUS.full, borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 11, paddingVertical: 4,
    backgroundColor: 'transparent',
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

  // Grid de 2 columnas
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%' },

  card:             { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  coverImg:         { width: '100%', height: 100 },
  coverPlaceholder: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center' },
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
  editBtn: {
    width: 24, height: 24, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
});
