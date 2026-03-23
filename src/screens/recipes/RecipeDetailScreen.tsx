// src/screens/recipes/RecipeDetailScreen.tsx
// Full recipe detail: ingredients, instructions, ratings, favourite toggle.
// Cross-platform: web, iOS, Android.
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { recipeService } from '../../services/api';
import { useApiCall } from '../../hooks/useApiCall';
import { StatusBadge, EmptyState, SkeletonList, ThemedCard, ActionMenu } from '../../components';
import { SPACING, RADIUS } from '../../constants/theme';

interface Props {
  navigation: any;
  route: { params: { recipeId: string } };
}

export default function RecipeDetailScreen({ navigation, route }: Props) {
  const { recipeId } = route.params;
  const { colors } = useTheme();
  const toast = useToast();
  const { user } = useAuth();

  const [userRating, setUserRating] = useState(0);

  const { data: recipe, loading, error, execute: loadRecipe } = useApiCall(recipeService.getById, {
    onError: (e) => toast.error('Failed to load recipe', e),
  });

  const { execute: toggleFav } = useApiCall(recipeService.toggleFavourite, {
    onSuccess: () => { toast.success(recipe?.isFavourited ? 'Removed from favourites' : 'Added to favourites'); loadRecipe(recipeId); },
    onError: (e) => toast.error('Failed', e),
  });

  const { execute: rateRecipe } = useApiCall(recipeService.createRating, {
    onSuccess: () => { toast.success('Rating saved'); loadRecipe(recipeId); },
    onError: (e) => toast.error('Rating failed', e),
  });

  const { execute: removeRating } = useApiCall(recipeService.deleteRating, {
    onSuccess: () => { toast.info('Rating removed'); setUserRating(0); loadRecipe(recipeId); },
    onError: (e) => toast.error('Failed', e),
  });

  const { execute: togglePublish } = useApiCall(recipeService.togglePublish, {
    onSuccess: () => { toast.success('Publication status updated'); loadRecipe(recipeId); },
    onError: (e) => toast.error('Failed', e),
  });

  const { execute: deleteRecipe } = useApiCall(recipeService.delete, {
    onSuccess: () => { toast.success('Recipe deleted'); navigation.goBack(); },
    onError: (e) => toast.error('Delete failed', e),
  });

  useEffect(() => { loadRecipe(recipeId); }, [recipeId]);

  useEffect(() => {
    if (!recipe) return;
    const isOwner = recipe.createdBy?.id === user?.id;
    if (!isOwner) return;
    navigation.setOptions({
      title: recipe.title,
      headerRight: () => (
        <ActionMenu actions={[
          { label: 'Edit', icon: 'pencil-outline', onPress: () => navigation.navigate('RecipeForm', { recipeId }) },
          { label: recipe.isPublished ? 'Unpublish' : 'Publish', icon: 'globe-outline', onPress: () => togglePublish(recipeId) },
          { label: 'Delete', icon: 'trash-outline', danger: true, onPress: () => {
            if (Platform.OS !== 'web') {
              Alert.alert('Delete recipe', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteRecipe(recipeId) },
              ]);
            } else {
              deleteRecipe(recipeId);
            }
          }},
        ]} />
      ),
    });
  }, [recipe]);

  if (loading && !recipe) return <View style={[styles.container, { backgroundColor: colors.background }]}><SkeletonList count={8} /></View>;
  if (error || !recipe) return <EmptyState type="error" title="Recipe not found" description={error ?? undefined} actionLabel="Go back" onAction={() => navigation.goBack()} />;

  const handleRate = async (score: number) => {
    setUserRating(score);
    await rateRecipe(recipeId, { score });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover image */}
      {recipe.coverImage
        ? <Image source={{ uri: recipe.coverImage }} style={styles.cover} />
        : <View style={[styles.coverPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="restaurant-outline" size={44} color={colors.textMuted} />
          </View>
      }

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{recipe.title}</Text>
          {recipe.category && (
            <Text style={[styles.category, { color: colors.textSecondary }]}>{recipe.category.name}</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => toggleFav(recipeId)} style={styles.favBtn}>
          <Ionicons
            name={recipe.isFavourited ? 'heart' : 'heart-outline'}
            size={26}
            color={recipe.isFavourited ? colors.danger : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Badges */}
      <View style={styles.badges}>
        <StatusBadge label={recipe.difficulty} auto />
        <StatusBadge label={recipe.isPublished ? 'published' : 'draft'} auto />
        {recipe.tags.map(t => <StatusBadge key={t.id} label={t.name} variant="secondary" size="sm" />)}
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {recipe.prepTimeMin != null && <Stat icon="time-outline" value={`${recipe.prepTimeMin}m`} label="Prep" colors={colors} />}
        {recipe.cookTimeMin != null && <Stat icon="flame-outline" value={`${recipe.cookTimeMin}m`} label="Cook" colors={colors} />}
        {recipe.servings    != null && <Stat icon="people-outline" value={String(recipe.servings)} label="Servings" colors={colors} />}
        {recipe.avgRating   != null && <Stat icon="star"   value={recipe.avgRating.toFixed(1)} label={`${recipe.ratingsCount ?? 0} ratings`} colors={colors} iconColor="#F59E0B" />}
      </View>

      {/* Description */}
      {recipe.description && (
        <ThemedCard>
          <Text style={[styles.description, { color: colors.textPrimary }]}>{recipe.description}</Text>
        </ThemedCard>
      )}

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <ThemedCard title={`Ingredients (${recipe.ingredients.length})`}>
          {recipe.ingredients
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((ing, i) => (
              <View key={ing.id} style={[styles.ingRow, i < recipe.ingredients.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.ingName, { color: colors.textPrimary }]}>{ing.name}</Text>
                <Text style={[styles.ingQty, { color: colors.textSecondary }]}>
                  {ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}
                </Text>
              </View>
            ))}
        </ThemedCard>
      )}

      {/* Instructions */}
      <ThemedCard title="Instructions">
        <Text style={[styles.instructions, { color: colors.textPrimary }]}>{recipe.instructions}</Text>
      </ThemedCard>

      {/* Rating */}
      <ThemedCard title="Rate this recipe">
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => handleRate(s)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Ionicons
                name={s <= userRating ? 'star' : 'star-outline'}
                size={30}
                color={s <= userRating ? '#F59E0B' : colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
        {userRating > 0 && (
          <TouchableOpacity onPress={() => removeRating(recipeId)} style={styles.removeRating}>
            <Text style={[styles.removeRatingText, { color: colors.textMuted }]}>Remove my rating</Text>
          </TouchableOpacity>
        )}
      </ThemedCard>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

function Stat({ icon, value, label, colors, iconColor }: any) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={iconColor ?? colors.primary} />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingBottom: SPACING.xl },
  cover:            { width: '100%', height: 220 },
  coverPlaceholder: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },
  header:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: 8 },
  title:     { fontSize: 22, fontWeight: '800', lineHeight: 28, flex: 1 },
  category:  { fontSize: 13, marginTop: 4 },
  favBtn:    { padding: 4 },
  badges:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: SPACING.lg, marginTop: 8 },
  statsRow: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md,
  },
  stat:      { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  description: { fontSize: 15, lineHeight: 22 },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  ingName: { fontSize: 14, flex: 1 },
  ingQty:  { fontSize: 14, fontWeight: '500' },
  instructions: { fontSize: 15, lineHeight: 24 },
  stars: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: SPACING.sm },
  removeRating:     { alignItems: 'center', marginTop: 4 },
  removeRatingText: { fontSize: 12 },
});
