// src/screens/recipes/RecipeFormScreen.tsx
// Create or edit a recipe. Includes ingredients editor, tag/category pickers.
// Cross-platform: web, iOS, Android.
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { recipeService } from '../../services/api';
import { useApiCall } from '../../hooks/useApiCall';
import { FormField, ThemedCard, ModalSheet, StatusBadge, SkeletonList } from '../../components';
import { SPACING, RADIUS } from '../../constants/theme';
import type { RecipeCategory, RecipeTag, RecipeDifficulty, RecipeIngredient } from '../../types/api.types';

interface Props {
  navigation: any;
  route: { params?: { recipeId?: string } };
}

type IngredientDraft = Omit<RecipeIngredient, 'id'> & { tempId: string };

const DIFFICULTIES: RecipeDifficulty[] = ['easy', 'medium', 'hard'];

export default function RecipeFormScreen({ navigation, route }: Props) {
  const recipeId = route.params?.recipeId;
  const isEdit   = !!recipeId;
  const { colors } = useTheme();
  const toast      = useToast();

  // Form state
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [instructions, setInstructions] = useState('');
  const [prepTime,     setPrepTime]     = useState('');
  const [cookTime,     setCookTime]     = useState('');
  const [servings,     setServings]     = useState('');
  const [difficulty,   setDifficulty]   = useState<RecipeDifficulty>('easy');
  const [isPublished,  setIsPublished]  = useState(false);
  const [coverImage,   setCoverImage]   = useState('');
  const [categoryId,   setCategoryId]   = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ingredients,  setIngredients]  = useState<IngredientDraft[]>([]);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  // Pickers
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [tags,       setTags]       = useState<RecipeTag[]>([]);
  const [catSheet,   setCatSheet]   = useState(false);
  const [tagSheet,   setTagSheet]   = useState(false);
  const [diffSheet,  setDiffSheet]  = useState(false);
  const [ingSheet,   setIngSheet]   = useState(false);
  const [editIngIdx, setEditIngIdx] = useState<number | null>(null);

  // Ingredient editor state
  const [ingName, setIngName] = useState('');
  const [ingQty,  setIngQty]  = useState('');
  const [ingUnit, setIngUnit] = useState('');

  const { execute: loadCategories } = useApiCall(recipeService.getCategories, { onSuccess: setCategories });
  const { execute: loadTags }       = useApiCall(recipeService.getTags,       { onSuccess: setTags });
  const { execute: loadRecipe, loading: loadingRecipe } = useApiCall(recipeService.getById, {
    onSuccess: (r) => {
      setTitle(r.title);
      setDescription(r.description ?? '');
      setInstructions(r.instructions);
      setPrepTime(r.prepTimeMin != null ? String(r.prepTimeMin) : '');
      setCookTime(r.cookTimeMin != null ? String(r.cookTimeMin) : '');
      setServings(r.servings != null ? String(r.servings) : '');
      setDifficulty(r.difficulty);
      setIsPublished(r.isPublished);
      setCoverImage(r.coverImage ?? '');
      setCategoryId(r.category?.id ?? null);
      setSelectedTags(r.tags.map(t => t.id));
      setIngredients(r.ingredients.map(i => ({ ...i, tempId: i.id })));
    },
    onError: (e) => { toast.error('Failed to load', e); navigation.goBack(); },
  });

  const { execute: createRecipe, loading: creating } = useApiCall(recipeService.create, {
    onSuccess: (r) => { 
      toast.success('Recipe created'); 
      navigation.reset({
        index: 0,
        routes: [{ name: 'RecipeDetail', params: { recipeId: r.id } }],
      });
    },
    onError:   (e) => toast.error('Create failed', e),
  });

  const { execute: updateRecipe, loading: updating } = useApiCall(recipeService.update, {
    onSuccess: () => { 
      toast.success('Recipe updated'); 
      navigation.navigate('Recipes');
    },
    onError:   (e) => toast.error('Update failed', e),
  });

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit recipe' : 'New recipe' });
    loadCategories();
    loadTags();
    if (isEdit && recipeId) loadRecipe(recipeId);
  }, [recipeId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim())        e.title        = 'Title is required';
    if (!instructions.trim()) e.instructions = 'Instructions are required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim() || undefined,
    instructions: instructions.trim(),
    prepTimeMin:  prepTime  ? parseInt(prepTime, 10)  : undefined,
    cookTimeMin:  cookTime  ? parseInt(cookTime, 10)  : undefined,
    servings:     servings  ? parseInt(servings, 10)  : undefined,
    difficulty,
    isPublished,
    coverImage:  coverImage.trim() || undefined,
    categoryId:  categoryId ?? undefined,
    tagIds:      selectedTags,
    ingredients: ingredients.map((ing, i) => ({
      name: ing.name, quantity: ing.quantity,
      unit: ing.unit, notes: ing.notes,
      displayOrder: i,
    })),
  });

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = buildPayload();
    if (isEdit && recipeId) await updateRecipe(recipeId, payload);
    else                    await createRecipe(payload);
  };

  const handleSaveIngredient = () => {
    if (!ingName.trim() || !ingQty.trim()) return;
    const item: IngredientDraft = {
      tempId: Date.now().toString(),
      name: ingName.trim(), quantity: ingQty.trim(),
      unit: ingUnit.trim() || undefined, notes: undefined, displayOrder: 0,
    };
    if (editIngIdx !== null) {
      setIngredients(prev => prev.map((ing, i) => i === editIngIdx ? item : ing));
    } else {
      setIngredients(prev => [...prev, item]);
    }
    setIngName(''); setIngQty(''); setIngUnit('');
    setEditIngIdx(null);
    setIngSheet(false);
  };

  const openEditIng = (idx: number) => {
    const ing = ingredients[idx];
    setIngName(ing.name); setIngQty(ing.quantity); setIngUnit(ing.unit ?? '');
    setEditIngIdx(idx);
    setIngSheet(true);
  };

  const saving = creating || updating;
  const selectedCategory = categories.find(c => c.id === categoryId);

  if (isEdit && loadingRecipe) return <View style={[styles.container, { backgroundColor: colors.background }]}><SkeletonList count={8} /></View>;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Basic info */}
      <ThemedCard title="Basic info">
        <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Recipe name" error={errors.title} required returnKeyType="next" />
        <FormField label="Description" value={description} onChangeText={setDescription} placeholder="Short description (optional)" multiline numberOfLines={2} />
        <FormField label="Cover image URL" value={coverImage} onChangeText={setCoverImage} placeholder="https://…" autoCapitalize="none" />
      </ThemedCard>

      {/* Details */}
      <ThemedCard title="Details">
        {/* Difficulty picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DIFFICULTY</Text>
          <TouchableOpacity 
            style={[styles.difficultySelector, { borderColor: colors.border, backgroundColor: colors.background }]} 
            onPress={() => setDiffSheet(true)}
          >
            <Text style={[styles.difficultyLabel, { color: colors.textPrimary }]}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.row3}>
          <View style={styles.timeField}>
            <FormField label="Prep (min)" value={prepTime} onChangeText={setPrepTime} placeholder="15" keyboardType="numeric" />
          </View>
          <View style={styles.timeField}>
            <FormField label="Cook (min)" value={cookTime} onChangeText={setCookTime} placeholder="30" keyboardType="numeric" />
          </View>
          <View style={styles.servingsField}>
            <FormField label="Servings" value={servings} onChangeText={setServings} placeholder="4" keyboardType="numeric" />
          </View>
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
          <TouchableOpacity style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]} onPress={() => setCatSheet(true)}>
            <Text style={[styles.selectorValue, { color: selectedCategory ? colors.textPrimary : colors.textMuted }]}>
              {selectedCategory?.name ?? 'None'}
            </Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Tags */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TAGS</Text>
          <TouchableOpacity style={[styles.tagsArea, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]} onPress={() => setTagSheet(true)}>
            {selectedTags.length === 0
              ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Add tags…</Text>
              : <View style={styles.tagRow}>
                  {selectedTags.map(id => {
                    const tag = tags.find(t => t.id === id);
                    return tag ? <StatusBadge key={id} label={tag.name} variant="secondary" size="sm" /> : null;
                  })}
                </View>
            }
          </TouchableOpacity>
        </View>

        {/* Published toggle */}
        <View style={[styles.publishedSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Published</Text>
            <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Visible to other users</Text>
          </View>
          <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={isPublished ? colors.background : colors.textSecondary} />
        </View>
        
        {/* Bottom spacing for Details block */}
        <View style={{ height: SPACING.md }} />
      </ThemedCard>

      {/* Ingredients */}
      <ThemedCard title={`Ingredients (${ingredients.length})`}>
        <View style={[styles.ingredientsContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {ingredients.map((ing, i) => (
            <View key={ing.tempId} style={[styles.ingRow, { borderBottomColor: colors.border }, i === ingredients.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.ingIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="nutrition-outline" size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ingName, { color: colors.textPrimary }]}>{ing.name}</Text>
                <Text style={[styles.ingQty, { color: colors.textSecondary }]}>{ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => openEditIng(i)} style={[styles.ingAction, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIngredients(prev => prev.filter((_, idx) => idx !== i))} style={[styles.ingAction, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.addIngBtn, { borderColor: colors.border }]} onPress={() => { setEditIngIdx(null); setIngName(''); setIngQty(''); setIngUnit(''); setIngSheet(true); }}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={[styles.addIngLabel, { color: colors.primary }]}>Add ingredient</Text>
        </TouchableOpacity>
      </ThemedCard>

      {/* Instructions */}
      <ThemedCard title="Instructions">
        <FormField label="Step by step" value={instructions} onChangeText={setInstructions} placeholder="Describe how to prepare this recipe…" multiline numberOfLines={6} error={errors.instructions} required />
      </ThemedCard>

      {/* Save */}
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]} onPress={handleSubmit} disabled={saving}>
        <Text style={[styles.saveBtnText, { color: colors.background }]}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create recipe'}</Text>
      </TouchableOpacity>

      <View style={{ height: SPACING.xl }} />

      {/* Pickers */}
      <ModalSheet visible={diffSheet} onClose={() => setDiffSheet(false)} title="Difficulty" compact>
        {DIFFICULTIES.map(d => (
          <TouchableOpacity key={d} style={[styles.sheetOption, { borderBottomColor: colors.border }, d === difficulty && { backgroundColor: colors.primaryDim }]} onPress={() => { setDifficulty(d); setDiffSheet(false); }}>
            <StatusBadge label={d} auto />
            {d === difficulty && <Text style={{ color: colors.primary }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </ModalSheet>

      <ModalSheet visible={catSheet} onClose={() => setCatSheet(false)} title="Category" compact>
        <TouchableOpacity style={[styles.sheetOption, { borderBottomColor: colors.border }, !categoryId && { backgroundColor: colors.primaryDim }]} onPress={() => { setCategoryId(null); setCatSheet(false); }}>
          <Text style={{ color: !categoryId ? colors.primary : colors.textPrimary }}>None</Text>
          {!categoryId && <Text style={{ color: colors.primary }}>✓</Text>}
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity key={c.id} style={[styles.sheetOption, { borderBottomColor: colors.border }, c.id === categoryId && { backgroundColor: colors.primaryDim }]} onPress={() => { setCategoryId(c.id); setCatSheet(false); }}>
            <Text style={{ color: c.id === categoryId ? colors.primary : colors.textPrimary }}>{c.name}</Text>
            {c.id === categoryId && <Text style={{ color: colors.primary }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </ModalSheet>

      <ModalSheet visible={tagSheet} onClose={() => setTagSheet(false)} title="Tags" primaryLabel="Done" onPrimary={() => setTagSheet(false)} compact>
        {tags.map(t => {
          const sel = selectedTags.includes(t.id);
          return (
            <TouchableOpacity key={t.id} style={[styles.sheetOption, { borderBottomColor: colors.border }, sel && { backgroundColor: colors.primaryDim }]}
              onPress={() => setSelectedTags(prev => sel ? prev.filter(id => id !== t.id) : [...prev, t.id])}>
              <Text style={{ color: sel ? colors.primary : colors.textPrimary }}>{t.name}</Text>
              {sel && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </ModalSheet>

      <ModalSheet visible={ingSheet} onClose={() => setIngSheet(false)} title={editIngIdx !== null ? 'Edit ingredient' : 'Add ingredient'} primaryLabel={editIngIdx !== null ? 'Save' : 'Add'} onPrimary={handleSaveIngredient} compact>
        <FormField label="Name" value={ingName} onChangeText={setIngName} placeholder="e.g. Flour" required returnKeyType="next" />
        <FormField label="Quantity" value={ingQty} onChangeText={setIngQty} placeholder="e.g. 200" required returnKeyType="next" />
        <FormField label="Unit (optional)" value={ingUnit} onChangeText={setIngUnit} placeholder="e.g. g, ml, cups" returnKeyType="done" />
      </ModalSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.lg },
  fieldGroup: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md },
  selectorValue: { fontSize: 15 },
  difficultySelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: SPACING.md, 
    paddingVertical: 12, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    minHeight: 48 
  },
  difficultyLabel: { 
    fontSize: 15, 
    fontWeight: '500' 
  },
  row3: { flexDirection: 'row', gap: 8 },
  timeField: { flex: 1, minWidth: 80 },
  servingsField: { flex: 0.8, minWidth: 70 },
  tagsArea: { minHeight: 44, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 8, justifyContent: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.md, borderTopWidth: 1, marginTop: 4 },
  publishedSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: SPACING.md, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    marginTop: SPACING.md,
    marginBottom: SPACING.md
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleSub:   { fontSize: 12, marginTop: 2 },
  ingredientsContainer: { 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    padding: SPACING.sm, 
    marginBottom: SPACING.sm 
  },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  ingIcon: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexShrink: 0 
  },
  ingName:   { fontSize: 14, fontWeight: '500' },
  ingQty:    { fontSize: 12, marginTop: 1 },
  ingAction: { 
    padding: 6, 
    borderRadius: RADIUS.sm, 
    marginLeft: 4 
  },
  addIngBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'transparent', marginTop: 4 },
  addIngLabel: { fontSize: 14, fontWeight: '600' },
  saveBtn: { height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
  saveBtnText: { fontSize: 16, fontWeight: '800' },
  sheetOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderRadius: RADIUS.sm },
});
