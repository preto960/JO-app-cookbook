// src/screens/recipes/RecipeDetailScreen.tsx
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
  route: any;
}

export default function RecipeDetailScreen({ navigation, route }: Props) {
  const recipeId: string | undefined =
    route?.params?.recipeId ?? route?.params?.id;

  const { colors } = useTheme();
  const toast = useToast();
  const { user } = useAuth();

  const [userRating, setUserRating] = useState(0);

  const { data: recipe, loading, error, execute: loadRecipe } = useApiCall(recipeService.getById, {
    onSuccess: (r) => {
      // Find user's rating in the ratings array
      const userRatingObj = r.ratings?.find(rating => rating.userId === user?.id?.toString());
      if (userRatingObj) {
        setUserRating(userRatingObj.score);
      } else {
        setUserRating(0);
      }
    },
    onError: (e) => toast.error('Failed to load recipe', e),
  });

  const { execute: toggleFav } = useApiCall(recipeService.toggleFavourite, {
    onSuccess: () => {
      toast.success(recipe?.isFavourited ? 'Removed from favourites' : 'Added to favourites');
      if (recipeId) loadRecipe(recipeId);
    },
    onError: (e) => toast.error('Failed', e),
  });

  const { execute: rateRecipe } = useApiCall(recipeService.createRating, {
    onSuccess: () => { toast.success('Rating saved'); if (recipeId) loadRecipe(recipeId); },
    onError: (e) => toast.error('Rating failed', e),
  });

  const { execute: removeRating } = useApiCall(recipeService.deleteRating, {
    onSuccess: () => { toast.info('Rating removed'); setUserRating(0); if (recipeId) loadRecipe(recipeId); },
    onError: (e) => toast.error('Failed', e),
  });

  const { execute: togglePublish } = useApiCall(recipeService.togglePublish, {
    onSuccess: () => { toast.success('Publication status updated'); if (recipeId) loadRecipe(recipeId); },
    onError: (e) => toast.error('Failed', e),
  });

  const { execute: deleteRecipe } = useApiCall(recipeService.delete, {
    onSuccess: () => { toast.success('Recipe deleted'); navigation.navigate('Recipes'); },
    onError: (e) => toast.error('Delete failed', e),
  });

  useEffect(() => {
    if (recipeId && recipeId !== 'undefined') {
      loadRecipe(recipeId);
    }
  }, [recipeId]);

  useEffect(() => {
    if (!recipe) return;
    const isOwner = (recipe.createdBy?.id || recipe.creator?.id) === user?.id?.toString();
    navigation.setOptions({
      title: recipe.title,
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Recipes')}
          activeOpacity={0.7}
          accessibilityLabel="Go back to recipes"
        >
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
      headerRight: isOwner ? () => (
        <ActionMenu actions={[
          { label: 'Edit', icon: 'pencil-outline', onPress: () => navigation.navigate('RecipeForm', { recipeId }) },
          { label: recipe.isPublished ? 'Unpublish' : 'Publish', icon: 'globe-outline', onPress: () => recipeId && togglePublish(recipeId) },
          {
            label: 'Delete', icon: 'trash-outline', danger: true,
            onPress: () => {
              if (Platform.OS !== 'web') {
                Alert.alert('Delete recipe', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => recipeId && deleteRecipe(recipeId) },
                ]);
              } else {
                if (recipeId) deleteRecipe(recipeId);
              }
            },
          },
        ]} />
      ) : undefined,
    });
  }, [recipe]);

  if (!recipeId || recipeId === 'undefined') {
    return (
      <EmptyState
        type="error"
        title="Recipe not found"
        description="No recipe ID was provided."
        actionLabel="Go back"
        onAction={() => navigation.navigate('Recipes')}
      />
    );
  }

  if (loading && !recipe) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={8} />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <EmptyState
        type="error"
        title="Recipe not found"
        description={error ?? undefined}
        actionLabel="Go back"
        onAction={() => navigation.navigate('Recipes')}
      />
    );
  }

  const handleRate = async (score: number) => {
    setUserRating(score);
    await rateRecipe(recipeId, { score });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {/* Cover image */}
      {recipe.coverImage ? (
        <Image source={{ uri: recipe.coverImage }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.coverPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="restaurant-outline" size={44} color={colors.textMuted} />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{recipe.title}</Text>
          {recipe.category && (
            <Text style={[styles.category, { color: colors.textSecondary }]}>{recipe.category.name}</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => toggleFav(recipeId)} style={styles.favBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
        {recipe.prepTimeMin != null && (
          <StatItem icon="time-outline" value={`${recipe.prepTimeMin}m`} label="Prep" colors={colors} />
        )}
        {recipe.cookTimeMin != null && (
          <StatItem icon="flame-outline" value={`${recipe.cookTimeMin}m`} label="Cook" colors={colors} />
        )}
        {recipe.servings != null && (
          <StatItem icon="people-outline" value={String(recipe.servings)} label="Servings" colors={colors} />
        )}
      </View>

      {/* Rating - compact version */}
      <View style={[styles.ratingSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.ratingTitle, { color: colors.textPrimary }]}>Rate this recipe</Text>
        <View style={styles.starsCompact}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => handleRate(s)}
              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            >
              <Ionicons
                name={s <= userRating ? 'star' : 'star-outline'}
                size={20}
                color={s <= userRating ? '#F59E0B' : colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
        {userRating > 0 && (
          <TouchableOpacity onPress={() => removeRating(recipeId)} style={styles.removeRatingCompact}>
            <Text style={[styles.removeRatingTextCompact, { color: colors.textMuted }]}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.contentPadding}>
        {/* Description */}
        {!!recipe.description && (
          <ThemedCard>
            <Text style={[styles.description, { color: colors.textPrimary }]}>{recipe.description}</Text>
          </ThemedCard>
        )}

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <ThemedCard title={`Ingredients (${recipe.ingredients.length})`}>
            <View style={[styles.ingredientsContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {recipe.ingredients
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((ing, i) => (
                  <View
                    key={ing.id}
                    style={[
                      styles.ingRow,
                      { borderBottomColor: colors.border },
                      i === recipe.ingredients.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={[styles.ingIcon, { backgroundColor: colors.primaryDim }]}>
                      <Ionicons name="nutrition-outline" size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ingName, { color: colors.textPrimary }]}>{ing.name}</Text>
                      <Text style={[styles.ingQty, { color: colors.textSecondary }]}>
                        {ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          </ThemedCard>
        )}

        {/* Instructions */}
        <ThemedCard title="Instructions">
          <View style={[styles.instructionsContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.instructions, { color: colors.textPrimary }]}>{recipe.instructions}</Text>
          </View>
        </ThemedCard>

      </View>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

function StatItem({ icon, value, label, colors, iconColor }: any) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={iconColor ?? colors.primary} />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingBottom: SPACING.xl },
  contentPadding: { paddingHorizontal: SPACING.md },

  cover:            { width: '100%', height: 220 },
  coverPlaceholder: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 8,
  },
  headerText: { flex: 1 },
  title:    { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  category: { fontSize: 13, marginTop: 4 },
  favBtn:   { paddingTop: 2 },

  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  stat:      { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, textAlign: 'center' },

  description:  { fontSize: 15, lineHeight: 22 },
  
  ingredientsContainer: { 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    padding: SPACING.sm, 
    marginTop: SPACING.xs 
  },
  instructionsContainer: { 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    padding: SPACING.md, 
    marginTop: SPACING.xs 
  },

  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  ingIcon: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexShrink: 0 
  },
  ingName: { fontSize: 14, fontWeight: '500' },
  ingQty:  { fontSize: 12, marginTop: 1 },

  instructions: { fontSize: 15, lineHeight: 24 },

  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  ratingTitle: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
  starsCompact: {
    flexDirection: 'row',
    gap: 6,
  },
  removeRatingCompact: { 
    marginLeft: SPACING.sm 
  },
  removeRatingTextCompact: { 
    fontSize: 11, 
    textDecorationLine: 'underline' 
  },
  backButton: {
    width: 40, 
    height: 40,
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 8,
  },
});
